# 節點轉換

轉換是響應 EditorState 變更的最有效機制。

例如：
用戶輸入一個字符，如果該單詞現在等於 "congrats"，你想把它的顏色設為藍色。
我們以程式方式將 `@Mention` 添加到編輯器中，該 `@Mention` 立即在另一個 `@Mention` 旁邊（`@Mention@Mention`）。由於我們認為這樣會使提及變得難以閱讀，我們想要刪除/替換這兩個提及，並將它們渲染為純文本節點。

```js
const removeTransform = editor.registerNodeTransform(TextNode, (textNode) => {
  if (textNode.getTextContent() === 'blue') {
    textNode.setTextContent('green');
  }
});
```

## 語法

```typescript
editor.registerNodeTransform<T: LexicalNode>(Class<T>, T): () => void
```

## 生命週期

轉換在將變更傳播到 DOM 之前會被順序執行，多次轉換仍然導致一次 DOM 協調（Lexical 生命週期中最昂貴的操作）。

![轉換生命週期](/img/docs/transforms-lifecycle.svg)

:::caution 警告！

雖然可以通過 [更新監聽器](/docs/concepts/listeners#registerupdatelistener) 來達到相同或非常相似的結果，但這是強烈不建議的，因為這會觸發額外的渲染（最昂貴的生命週期操作）。

此外，每個週期會創建一個全新的 `EditorState` 物件，如果處理不當，可能會干擾像 HistoryPlugin（撤銷-重做）等插件。

```js
editor.registerUpdateListener(() => {
  editor.update(() => {
    // 不要這麼做
  });
});
```

:::

### 轉換啟發式

1. 我們首先轉換葉節點。如果轉換生成了額外的髒節點，我們會重複 `步驟 1`。這樣做的理由是，將葉節點標記為髒會將所有其父元素也標記為髒。
2. 我們轉換元素。
   - 如果元素轉換生成了額外的髒節點，我們會重複 `步驟 1`。
   - 如果元素轉換只生成了額外的髒元素，我們只重複 `步驟 2`。

節點在對其進行任何（或大多數）修改時，都會被標記為髒，這在某些情況下也包括其子節點或兄弟節點。

## 前提條件

前提條件對於轉換至關重要，以防止它們多次運行並最終造成無限循環。

轉換旨在在節點被修改（即標記節點為髒）時運行。在大多數情況下，轉換只需在更新後運行一次，但轉換的順序性使得存在順序偏見的可能性。因此，轉換會一遍又一遍地運行，直到這種類型的節點不再被任何轉換標記為髒。

因此，我們必須確保轉換不會不必要地標記節點為髒。

```js
// 當 TextNode 發生變化（標記為髒）時，將其加粗
editor.registerNodeTransform(TextNode, (textNode) => {
  // 重要：檢查當前格式狀態
  if (!textNode.hasFormat('bold')) {
    textNode.toggleFormat('bold');
  }
});
```

但通常，順序並不重要。以下代碼最終將會得到兩個轉換的結果：

```js
// 插件 1
editor.registerNodeTransform(TextNode, (textNode) => {
  // 這個轉換運行兩次，但第一次不做任何事情，因為它不符合前提條件
  if (textNode.getTextContent() === 'modified') {
    textNode.setTextContent('re-modified');
  }
});
// 插件 2
editor.registerNodeTransform(TextNode, (textNode) => {
  // 這個轉換只運行一次
  if (textNode.getTextContent() === 'original') {
    textNode.setTextContent('modified');
  }
});
// 應用
editor.addListener('update', ({editorState}) => {
  const text = editorState.read($textContent);
  // text === 're-modified'
});
```

## 父節點上的轉換

轉換對於特定類型的節點非常具體。這適用於聲明 (`registerNodeTransform(ImageNode)`) 和在更新週期中觸發的次數。

```js
// 不會觸發
editor.registerNodeTransform(ParagraphNode, ..)
// 會觸發，因為 TextNode 被標記為髒
editor.registerNodeTransform(TextNode, ..)
editor.update(() => {
  const textNode = $getNodeByKey('3');
  textNode.setTextContent('foo');
});
```

儘管標記為髒的規則總是適用，但有些情況下這不是立刻明顯的，或者我們強制附近的節點變髒以便於更簡單的轉換邏輯：

- 當你將節點添加到 ElementNode 時，ElementNode 和新添加的子節點會被標記為髒，同時也包括其新的直接兄弟節點
- 當你刪除節點時，其父節點會被標記為髒，並且節點被刪除之前的直接兄弟節點也會被標記為髒
- 當你通過 `replace` 移動節點時，適用於規則 2 和 1。

```js
editor.registerNodeTransform(ParagraphNode, (paragraph) => {
  // 觸發
});
editor.update(() => {
  const paragraph = $getRoot().getFirstChild();
  paragraph.append($createTextNode('foo'));
});
```

## registerLexicalTextEntity

根據文本內容和兄弟節點創建/銷毀某些節點是很常見的。例如，`#lexical` 是有效的標籤，而 `#!lexical` 不是。

這是一個非常有效的轉換用例，但我們已經為這個特定用例構建了一個實用的轉換包裝器：

```typescript
registerLexicalTextEntity<N: TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): Array<() => void>;
```

## 範例

1. [Emojis](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/EmojisPlugin/index.ts)
2. [AutoLink](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/AutoLinkPlugin/index.tsx)
3. [HashtagPlugin](https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalHashtagPlugin.ts)
