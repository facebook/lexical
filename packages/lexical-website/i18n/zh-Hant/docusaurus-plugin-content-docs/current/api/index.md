---
id: 'index'
title: '@lexical/monorepo'
custom_edit_url: null
sidebar_label: '簡介'
---

<h1 align="center">
  <a href="https://lexical.dev">Lexical</a>
</h1>

<p align="center">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/facebook/lexical/tests.yml"/>
  <a href="https://www.npmjs.com/package/lexical">
    <img alt="Visit the NPM page" src="https://img.shields.io/npm/v/lexical"/>
  </a>
  <a href="https://discord.gg/KmG4wQnnD9">
    <img alt="Add yourself to our Discord" src="https://img.shields.io/discord/953974421008293909"/>
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=lexicaljs">
    <img alt="Follow us on Twitter" src="https://img.shields.io/twitter/follow/lexicaljs?style=social"/>
  </a>
</p>

Lexical 是一個擴展性強的 JavaScript 網頁文字編輯框架，重點在於可靠性、可達性和性能。Lexical 旨在提供一流的開發者體驗，使您能夠輕鬆原型設計並自信地建立功能。結合高度擴展的架構，Lexical 使開發者能夠創建獨特的文字編輯體驗，這些體驗可以在規模和功能上擴展。

有關 Lexical 的文檔和更多資訊，請務必 [訪問 Lexical 網站](https://lexical.dev)。

以下是您可以用 Lexical 做的一些示例：

- [Lexical Playground](https://playground.lexical.dev)
- [純文本沙盒](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-plain-text?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview)
- [富文本沙盒](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview)

---

**概覽：**

- [開始使用 React](#getting-started-with-react)

- [Lexical 是一個框架](#lexical-is-a-framework)

- [使用 Lexical](#working-with-lexical)

- [貢獻給 Lexical](#contributing-to-lexical)

---

## 開始使用 React

> 注意：Lexical 不僅限於 React。Lexical 可以支持任何基於 DOM 的庫，只要為該庫創建了綁定即可。

安裝 `lexical` 和 `@lexical/react`：

```
npm install --save lexical @lexical/react
```

下面是一個使用 `lexical` 和 `@lexical/react` 的基本純文本編輯器示例 ([自己試試](https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-plain-text?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview))。

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // 主題樣式放在這裡
  // ...
};

// 當編輯器發生變化時，您可以通過
// LexicalOnChangePlugin 獲得通知！
function onChange(editorState) {
  editorState.read(() => {
    // 在這裡讀取 EditorState 的內容。
    const root = $getRoot();
    const selection = $getSelection();

    console.log(root, selection);
  });
}

// Lexical React 插件是 React 組件，使它們
// 高度可組合。此外，您還可以按需加載插件，
// 這樣在實際使用插件之前不會承擔插件的成本。
function MyCustomAutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 當效果發生時，將焦點設置到編輯器上！
    editor.focus();
  }, [editor]);

  return null;
}

// 捕捉 Lexical 更新過程中發生的任何錯誤並記錄它們
// 或在需要時拋出。如果您不拋出它們，Lexical 將
// 嘗試優雅地恢復而不丟失用戶數據。
function onError(error) {
  console.error(error);
}

function Editor() {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>輸入一些文本...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## Lexical 是一個框架

Lexical 的核心是一個不依賴任何庫的文字編輯框架，允許開發者構建功能強大、簡單和複雜的編輯介面。Lexical 擁有幾個值得探索的概念：

### 編輯器實例

編輯器實例是將所有內容連接在一起的核心。您可以將一個可編輯的 DOM 元素附加到編輯器實例上，並註冊監聽器和命令。最重要的是，編輯器允許更新其 `EditorState`。您可以使用 `createEditor()` API 創建一個編輯器實例，但在使用如 `@lexical/react` 的框架綁定時，通常不必擔心這一點，因為這會為您處理。

### 編輯器狀態

編輯器狀態是表示您想在 DOM 上顯示的內容的底層數據模型。編輯器狀態包含兩部分：

- 一個 Lexical 節點樹
- 一個 Lexical 選擇對象

編輯器狀態一旦創建就是不可變的，並且要創建一個編輯器狀態，您必須通過 `editor.update(() => {...})` 來完成。然而，您也可以使用節點轉換或命令處理程序來「掛鉤」到現有更新中——這些處理程序在現有的更新工作流中被調用，以防止更新的級聯/瀑布效應。您可以使用 `editor.getEditorState()` 獲取當前編輯器狀態。

編輯器狀態也可以完全序列化為 JSON，並可以輕鬆地通過 `editor.parseEditorState()` 序列化回編輯器中。

### 讀取和更新編輯器狀態

當您想讀取和/或更新 Lexical 節點樹時，必須通過 `editor.update(() => {...})` 來進行。您也可以通過 `editor.read(() => {...})` 或 `editor.getEditorState().read(() => {...})` 進行只讀操作。傳遞給更新或讀取調用的閉包是重要的，並且必須是同步的。這是您擁有完整「lexical」上下文的唯一地方，並提供對編輯器狀態節點樹的訪問。我們提倡使用 `$` 前綴函數（例如 `$getRoot()`）來表示這些函數必須在這個上下文中調用。試圖在讀取或更新之外使用它們會觸發運行時錯誤。

對於熟悉 React Hooks 的人，您可以將這些 $函數視為具有類似功能：
| *功能* | React Hooks | Lexical $函數 |
| -- | -- | -- |
| 命名約定 | `useFunction` | `$function` |
| 需要上下文 | 只能在渲染時調用 | 只能在更新或讀取時調用 |
| 可以組合 | Hooks 可以調用其他 Hooks | $函數可以調用其他 $函數 |
| 必須是同步的

| ✅ | ✅ |
| 其他規則 | ❌ 必須在相同順序下無條件調用 | ✅ 無 |

節點轉換和命令監聽器在隱含的 `editor.update(() => {...})` 上下文中被調用。

可以進行嵌套更新或嵌套讀取，但更新不應該嵌套在讀取中，反之亦然。例如，`editor.update(() => editor.update(() => {...}))` 是允許的。允許在 `editor.update` 結束時嵌套 `editor.read`，但這會立即刷新更新，並且在該回調中的任何額外更新將會引發錯誤。

所有 Lexical 節點都依賴於相關的編輯器狀態。除少數例外情況外，您應該僅在讀取或更新調用中調用 Lexical 節點的方法和訪問屬性（就像 `$` 函數一樣）。Lexical 節點上的方法將首先嘗試使用節點的唯一鍵從活動編輯器狀態中找到最新（且可能是可寫）的節點版本。邏輯節點的所有版本都有相同的鍵。這些鍵由編輯器管理，只存在於運行時（未序列化），應被視為隨機和不透明（不要編寫假設鍵的硬編碼值的測試）。

這是因為編輯器狀態的節點樹在調和後是遞歸凍結的，以支持高效的時間旅行（撤銷/重做及類似的用例）。更新節點的方法首先調用 `node.getWritable()`，這將創建一個可寫的節點副本。這通常意味著任何現有的引用（如局部變量）將指向過時的節點版本，但讓 Lexical 節點始終參考編輯器狀態可以使數據模型更簡單且更少出錯。

:::tip

如果您使用 `editor.read(() => { /* 回調 */ })`，它將首先刷新任何待處理的更新，因此您將始終看到一致的狀態。當您在 `editor.update` 中時，您將始終處於待處理狀態，節點轉換和 DOM 調和可能尚未運行。`editor.getEditorState().read()` 將使用最新的調和後的 `EditorState`（在任何節點轉換、DOM 調和等已經運行後），任何待處理的 `editor.update` 變更尚不可見。

:::

### DOM 調和器

Lexical 擁有自己的 DOM 調和器，該調和器接收一組編輯器狀態（始終是「當前」和「待處理」）並在它們之間進行「差異比較」。然後，它使用這些差異來僅更新需要變更的 DOM 部分。你可以把這看作一種類似虛擬 DOM 的技術，但 Lexical 能夠跳過許多差異比較的工作，因為它知道在給定的更新中哪些部分被改變了。DOM 調和器採取性能優化措施，以適應內容可編輯元素的典型啟發式，並能夠自動確保 LTR 和 RTL 語言的一致性。

### 監聽器、節點轉換和命令

除了觸發更新外，大部分使用 Lexical 的工作是通過監聽器、節點轉換和命令來完成的。這些都來自編輯器，並以 `register` 為前綴。另一個重要特點是，所有的註冊方法都返回一個函數，用於輕鬆取消訂閱。例如，以下是如何監聽 Lexical 編輯器的更新：

```js
const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // 更新已發生！
  console.log(editorState);
});

// 確保稍後移除監聽器！
unregisterListener();
```

命令是用於將 Lexical 中的一切連接在一起的通信系統。可以使用 `createCommand()` 創建自定義命令，並使用 `editor.dispatchCommand(command, payload)` 發送到編輯器。Lexical 在按鍵事件觸發和其他重要信號發生時會內部派發命令。命令也可以使用 `editor.registerCommand(handler, priority)` 進行處理，並且傳入的命令會按照優先級通過所有處理器進行傳播，直到某個處理器停止傳播（類似於瀏覽器中的事件傳播）。

## 使用 Lexical

本節涵蓋了如何獨立於任何框架或庫使用 Lexical。對於打算在 React 應用中使用 Lexical 的人，建議 [查看 `@lexical/react` 中提供的 hooks 源碼](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src)。

### 創建並使用編輯器

當你使用 Lexical 時，通常會處理單個編輯器實例。編輯器實例可以被認為是負責將編輯器狀態與 DOM 連接起來的部分。編輯器也是你可以註冊自定義節點、添加監聽器和轉換的地方。

可以從 `lexical` 套件中創建編輯器實例，並接受一個可選的配置對象，該對象允許設置主題和其他選項：

```js
import {createEditor} from 'lexical';

const config = {
  namespace: 'MyEditor',
  theme: {
    ...
  },
};

const editor = createEditor(config);
```

一旦你擁有了編輯器實例，你可以在準備好後，將編輯器實例與文檔中的內容可編輯 `<div>` 元素關聯起來：

```js
const contentEditableElement = document.getElementById('editor');

editor.setRootElement(contentEditableElement);
```

如果你想從元素中清除編輯器實例，可以傳遞 `null`。另外，如果需要切換到另一個元素，只需將替代元素參考傳遞給 `setRootElement()` 即可。

### 使用編輯器狀態

在 Lexical 中，真實的來源不是 DOM，而是 Lexical 維護並與編輯器實例關聯的底層狀態模型。你可以通過調用 `editor.getEditorState()` 獲取最新的編輯器狀態。

編輯器狀態是可序列化為 JSON 的，編輯器實例提供了一個有用的方法來反序列化字符串化的編輯器狀態。

```js
const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());

const newEditorState = editor.parseEditorState(stringifiedEditorState);
```

### 更新編輯器

更新編輯器實例有幾種方法：

- 使用 `editor.update()` 觸發更新
- 通過 `editor.setEditorState()` 設置編輯器狀態
- 通過 `editor.registerNodeTransform()` 作為現有更新的一部分應用更改
- 使用 `editor.registerCommand(EXAMPLE_COMMAND, () => {...}, priority)` 註冊命令監聽器

最常見的更新編輯器方法是使用 `editor.update()`。調用此函數需要傳遞一個函數，該函數將提供訪問權限來更改底層的編輯器狀態。在開始新的更新時，當前的編輯器狀態會被克隆並用作起始點。從技術角度來看，這意味著 Lexical 在更新期間利用了一種稱為雙緩衝技術的方法。這有一個表示當前屏幕內容的編輯器狀態，還有另一個代表未來更改的工作中的編輯器狀態。

調和更新通常是一個異步過程，使 Lexical 能夠將多個同步的編輯器狀態更新批量處理成單個 DOM 更新——從而提高性能。當 Lexical 準備將更新提交到 DOM 時，更新批次中的底層變更和變異將形成一個新的不可變編輯器狀態。調用 `editor.getEditorState()` 將返回基於更新變更的最新編輯器狀態。

以下是如何更新編輯器實例的示例：

```js
import {$getRoot, $getSelection, $createParagraphNode} from 'lexical';

// 在 `editor.update` 內部，你可以使用特殊的 $ 前綴輔助函數。
// 這些函數不能在閉包外部使用，嘗試使用會報錯。
// （如果你對 React 熟悉，可以把這些函數想像成像在 React 函數組件外部使用 hook 一樣）。
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

如果你想知道編輯器何時更新，以便對更改做出反應，可以向編輯器添加一個更新監聽器，如下所示：

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

## 貢獻 Lexical

請閱讀 [CONTRIBUTING.md](https://github.com/facebook/lexical/blob/main/CONTRIBUTING.md)。

### 可選但推薦，使用 VSCode 進行開發

1. 下載並安裝 VSCode

   - 從 [這裡](https://code.visualstudio.com/download) 下載（建議使用未修改的版本）

2. 安裝擴展
   - [Flow 語言支持](https://marketplace.visualstudio.com/items?itemName=flowtype.flow-for-vscode)
     - 確保按照 README 中的設置步驟進行
   - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
     - 在 `editor.defaultFormatter` 中設置 Prettier 為默認格式化工具
     - 可選：設置保存時自動格式化 `editor.formatOnSave`
   - [ESlint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## 文檔

- [開始使用](https://lexical.dev/docs/intro)
- [概念](https://lexical.dev/docs/concepts/editor-state)
- [Lexical 的設計](https://lexical.dev/docs/design)
- [測試](https://lexical.dev/docs/testing)
- [維護者指南](https://lexical.dev/docs/maintainers-guide)

## 瀏覽器支持

- Firefox 52+
- Chrome 49+
- Edge 79+（當 Edge 轉向 Chromium 時）
- Safari 11+
- iOS 11+（Safari）
- iPad OS 13+（Safari）
- Android Chrome 72+

注意：Lexical 不支持 Internet Explorer 或舊版本的 Edge。

## 貢獻

1. 創建新分支
   - `git checkout -b my-new-branch`
2. 提交更改
   - `git commit -a -m '描述更改'`
     - 有很多方法可以做到這一點，這只是建議
3. 將分支推送到 GitHub
   - `git push origin my-new-branch`
4. 前往 GitHub 的儲存庫頁面並點擊「比較與拉取請求」
   - [GitHub CLI](https://cli.github.com/manual/gh_pr_create) 允許你跳過這一步的網頁介面（還有更多功能）

## 支持

如果你有任何關於 Lexical 的問題，想討論錯誤報告或對新集成有疑問，隨時加入我們的 [Discord 伺服器](https://discord.gg/KmG4wQnnD9)。

Lexical 工程師會定期檢查此伺服器。

## 運行測試

- `npm run test-unit` 僅運行單元測試。
- `npm run test-e2e-chromium` 僅運行 chromium e2e 測試。
- `npm run debug-test-e2e-chromium` 僅在調試模式下運行 chromium e2e 測試。
- `npm run test-e2e-firefox` 僅運行 firefox e2e 測試。
- `npm run debug-test-e2e-firefox` 僅在調試模式下運行 firefox e2e 測試。
- `npm run test-e2e-webkit` 僅運行 webkit e2e 測試。
- `npm run debug-test-e2e-webkit` 僅在調試模式下運行 webkit e2e 測試。

### 授權

Lexical 採用 [MIT 授權](https://github.com/facebook/lexical/blob/main/LICENSE)。
