# 選擇

## 選擇的類型

Lexical 的選擇是 `EditorState` 的一部分。這意味著每次更新或更改編輯器時，選擇總是與 `EditorState` 的節點樹保持一致。

在 Lexical 中，有四種可能的選擇類型：

- `RangeSelection`
- `NodeSelection`
- `TableSelection`（在 `@lexical/table` 中實現）
- `null`

雖然可以實現自定義的選擇類型來實現 `BaseSelection`，但通常不推薦這樣做。

### `RangeSelection`

這是最常見的選擇類型，它是對瀏覽器 DOM 選擇和範圍 API 的標準化。`RangeSelection` 包含三個主要屬性：

- `anchor` 代表一個 `RangeSelection` 點
- `focus` 代表一個 `RangeSelection` 點
- `format` 數字位元標誌，代表任何活躍的文本格式

`anchor` 和 `focus` 點都指向代表編輯器中特定部分的對象。`RangeSelection` 點的主要屬性有：

- `key` 代表所選擇的 Lexical 節點的 `NodeKey`
- `offset` 代表在所選擇的 Lexical 節點中的位置。對於 `text` 類型，這是字符，對於 `element` 類型，這是 `ElementNode` 中的子索引
- `type` 代表 `element` 或 `text`。

### `NodeSelection`

`NodeSelection` 代表多個任意節點的選擇。例如，同時選擇三張圖片。

- `getNodes()` 返回包含所選擇的 LexicalNodes 的數組

### `TableSelection`

`TableSelection` 代表類似表格的網格選擇。它存儲了進行選擇的父節點的鍵以及起始和結束點。`TableSelection` 包含三個主要屬性：

- `tableKey` 代表進行選擇的父節點鍵
- `anchor` 代表一個 `TableSelection` 點
- `focus` 代表一個 `TableSelection` 點

例如，選擇表格中行 = 1 列 = 1 到行 2 列 = 2 可能會存儲如下：

- `tableKey = 2` 表格鍵
- `anchor = 4` 表格單元格（鍵可能會變化）
- `focus = 10` 表格單元格（鍵可能會變化）

注意 `anchor` 和 `focus` 點的工作方式與 `RangeSelection` 相同。

### `null`

這表示編輯器沒有任何活動選擇。這在編輯器失去焦點或選擇移到頁面上的其他編輯器時很常見。當嘗試選擇編輯器空間內的非可編輯組件時，也可能會發生這種情況。

## 使用選擇

可以使用 `$getSelection()` 助手來查找選擇，該助手從 `lexical` 包中導出。此功能可在更新、讀取或命令監聽器中使用。

```js
import {$getSelection, SELECTION_CHANGE_COMMAND} from 'lexical';

editor.update(() => {
  const selection = $getSelection();
});

editorState.read(() => {
  const selection = $getSelection();
});

// SELECTION_CHANGE_COMMAND 在 Lexical 編輯器中選擇變更時觸發。
editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
  const selection = $getSelection();
});
```

在某些情況下，您可能希望創建一種新的選擇類型並將編輯器選擇設置為該類型。這只能在更新或命令監聽器中進行。

```js
import {
  $setSelection,
  $createRangeSelection,
  $createNodeSelection,
} from 'lexical';

editor.update(() => {
  // 設置範圍選擇
  const rangeSelection = $createRangeSelection();
  $setSelection(rangeSelection);

  // 您也可以通過調用 Lexical 節點上的一些選擇方法來間接創建範圍選擇。
  const someNode = $getNodeByKey(someKey);

  // 在元素節點上，這將創建一個類型為 "element" 的 RangeSelection，
  // 參考與元素中的子節點相關的偏移量。
  // 在文本節點上，這將創建一個類型為 "text" 的 RangeSelection，
  // 參考文本字符的偏移量。
  someNode.select();
  someNode.selectPrevious();
  someNode.selectNext();

  // 您可以在任何節點上使用這些方法。
  someNode.selectStart();
  someNode.selectEnd();

  // 設置節點選擇
  const nodeSelection = $createNodeSelection();
  // 將節點鍵添加到選擇中。
  nodeSelection.add(someKey);
  $setSelection(nodeSelection);

  // 您也可以通過將選擇設置為 `null` 來清除選擇。
  $setSelection(null);
});
```
