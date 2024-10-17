# 編輯器狀態

## 為什麼它是必要的？

在 Lexical 中，事實的來源並不是 DOM，而是 Lexical 維護並與編輯器實例關聯的底層狀態模型。

雖然 HTML 在存儲豐富的文本內容方面非常出色，但在文本編輯方面卻常常「過於靈活」。例如，以下幾行內容將產生相同的結果：

```html
<i><b>Lexical</b></i>
<i><b>Lex<b><b>ical</b></i>
<b><i>Lexical</i></b>
```

<details>
  <summary>查看渲染版本！</summary>
  <div>
    <i><b>Lexical</b></i>
    <i><b>Lex</b><b>ical</b></i>
    <b><i>Lexical</i></b>
  </div>
</details>

當然，可以通過 DOM 操作將這些變體標準化為單一的規範形式，這需要重新渲染內容。為了克服這個問題，我們可以使用虛擬 DOM 或狀態。

除此之外，它還允許將內容結構與內容格式分離。讓我們看看這個存儲在 HTML 中的示例：

```html
<p>
  為什麼 JavaScript 開發者去酒吧？
  <b>
    因為他無法處理他的
    <i>Promise</i>
    s
  </b>
</p>
```

<figure class="text--center">
  <img src="/img/docs/state-formatting-html.drawio.svg" alt="HTML 狀態的嵌套結構"/>
  <figcaption>由於格式化，HTML 狀態的嵌套結構</figcaption>
</figure>

相比之下，Lexical 通過將這些信息偏移到屬性中，將結構與格式化分離。這使我們無論應用不同樣式的順序如何，都能擁有規範的文檔結構。

<figure class="text--center">
  <img src="/img/docs/state-formatting-lexical.png" alt="平坦的 Lexical 狀態結構"/>
  <figcaption>平坦的 Lexical 狀態結構</figcaption>
</figure>

## 理解編輯器狀態

你可以通過調用 `editor.getEditorState()` 獲取編輯器的最新狀態。

編輯器狀態有兩個階段：

- 在更新期間，它們可以被視為「可變的」。參見「更新狀態」部分來修改編輯器狀態。
- 在更新之後，編輯器狀態將被鎖定，並從那時起被視為不可變的。這樣的編輯器狀態可以被視為「快照」。

編輯器狀態包含兩個核心內容：

- 編輯器節點樹（從根節點開始）。
- 編輯器選擇（可以為 null）。

編輯器狀態可以序列化為 JSON，編輯器實例提供了一個方便的方法來反序列化字符串化的編輯器狀態。

以下是如何使用一些狀態初始化編輯器並持久化它的示例：

```js
// 獲取編輯器的初始狀態（例如，從後端加載）
const loadContent = async () => {
  // '空' 編輯器
  const value = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  return value;
}

const initialEditorState = await loadContent();
const editor = createEditor(...);
registerRichText(editor, initialEditorState);

...

// 處理器，用於存儲內容（例如當用戶提交表單時）
const onSubmit = () => {
  await saveContent(JSON.stringify(editor.getEditorState()));
}
```

對於 React，可以是如下所示：

```jsx
const initialEditorState = await loadContent();
const editorStateRef = useRef(undefined);

<LexicalComposer
  initialConfig={{
    editorState: initialEditorState,
  }}>
  <LexicalRichTextPlugin />
  <LexicalOnChangePlugin
    onChange={(editorState) => {
      editorStateRef.current = editorState;
    }}
  />
  <Button
    label="保存"
    onPress={() => {
      if (editorStateRef.current) {
        saveContent(JSON.stringify(editorStateRef.current));
      }
    }}
  />
</LexicalComposer>;
```

請注意，Lexical 只會使用 `initialConfig.editorState` 一次（當它被初始化時），以後傳遞不同的值將不會在編輯器中反映。請參見「更新狀態」部分，了解更新編輯器狀態的正確方法。

## 更新狀態

:::tip

想深入了解狀態更新的工作原理，請查看 Lexical 貢獻者 [@DaniGuardiola](https://twitter.com/daniguardio_la) 撰寫的 [這篇博文](https://dio.la/article/lexical-state-updates)。

:::

更新編輯器的最常見方法是使用 `editor.update()`。調用此函數需要傳遞一個函數，該函數將提供訪問權限來更改底層的編輯器狀態。當開始新的更新時，當前的編輯器狀態將被克隆並用作起點。從技術角度來看，這意味著 Lexical 在更新期間利用了一種稱為雙緩衝技術的方法。這裡有一個「當前」凍結的編輯器狀態，表示最近與 DOM 調和的狀態，還有一個工作中的「待定」編輯器狀態，表示下一次調和的未來更改。

調和更新通常是一個異步過程，這允許 Lexical 將多個同步的編輯器狀態更新批量處理成一次更新 DOM ——從而提高性能。當 Lexical 準備將更新提交到 DOM 時，更新批次中的底層變更和突變將形成一個新的不可變編輯器狀態。調用 `editor.getEditorState()` 將返回基於更新變更的最新編輯器狀態。

以下是如何更新編輯器實例的示例：

```js
import {$getRoot, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical';

// 在 `editor.update` 內部，你可以使用特殊的 $ 前綴輔助函數。
// 這些函數不能在閉包外部使用，嘗試使用會報錯。
// （如果你熟悉 React，可以將這些函數想像成像在 React 函數組件外部使用 hook 一樣）。
editor.update(() => {
  // 從 EditorState 中獲取 RootNode
  const root = $getRoot();

  // 從 EditorState 中獲取選擇
  const selection = $getSelection();

  // 創建一個新的 ParagraphNode
  const paragraphNode = $createParagraphNode();

  // 創建一個新的 TextNode
  const textNode = $createTextNode('Hello world');

  // 將文本節點附加到段落中
  paragraphNode.append(textNode);

  // 最後，將段落附加到根節點
  root.append(paragraphNode);
});
```

另一種設置狀態的方法是 `setEditorState` 方法，它將當前狀態替換為作為參數傳遞的狀態。

以下是如何從字符串化的 JSON 設置編輯器狀態的示例：

```js
const editorState = editor.parseEditorState(editorStateJSONString);
editor.setEditorState(editorState);
```

## 狀態更新監聽器

如果你想知道編輯器何時更新，以便對更改做出反應，你可以向編輯器添加一個更新監聽器，如下所示：

```js
editor.registerUpdateListener(({editorState}) => {
  // 最新的 EditorState 可以在 `editorState` 中找到。
  // 要讀取 EditorState 的內容，請使用以下 API：

  editorState.read(() => {
    // 就像 editor.update() 一樣，.read() 期望一個閉包，在其中可以使用
    // 以 $ 前綴的輔助函數。
  });
});
```

## 監聽器、轉換和命令何時被調用？

有幾種類型的回調可以與編輯器一起註冊，這些回調與編輯器狀態的更新有關。

| 回調類型   | 什麼時候被調用 |
| ---------- | -------------- |
| 更新監聽器 | 在調和之後     |
| 突變監聽器 | 在調和之後     |
| 節點轉換   |

在 `editor.update()` 期間，在回調完成之後，如果它們註冊的節點類型的任何實例被更新 |
| 命令 | 當命令發送到編輯器時（從隱式的 `editor.update()` 調用） |

## 使用離散更新進行同步調和

雖然提交調度和批處理通常是我們所希望的，但它們有時會妨礙。

考慮這個例子：你正試圖在服務器上下文中操作編輯器狀態，然後將其持久化到數據庫中。

```js
editor.update(() => {
  // 操作狀態...
});

saveToDatabase(editor.getEditorState().toJSON());
```

此代碼將無法按預期工作，因為 `saveToDatabase` 調用將在狀態提交之前發生。
將保存的狀態將是更新之前存在的狀態。

幸運的是，`LexicalEditor.update` 的 `discrete` 選項強制立即提交更新。

```js
editor.update(
  () => {
    // 操作狀態...
  },
  {discrete: true},
);

saveToDatabase(editor.getEditorState().toJSON());
```

### 克隆狀態

Lexical 狀態可以被克隆，並且可以選擇帶有自定義選擇。你想要這樣做的一種情況是設置編輯器的狀態，但不強制任何選擇：

```js
// 將 `null` 作為選擇值傳遞以防止聚焦編輯器
editor.setEditorState(editorState.clone(null));
```
