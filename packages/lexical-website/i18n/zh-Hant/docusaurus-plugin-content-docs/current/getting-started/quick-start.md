---
sidebar_position: 1
---

# 快速入門 (Vanilla JS)

本節介紹如何在不依賴任何框架或庫的情況下使用 Lexical。如果您打算在 React 應用中使用 Lexical，建議您[查看 React 的入門頁面](https://lexical.dev/docs/getting-started/react)。

### 創建和使用編輯器

在使用 Lexical 時，通常會使用一個編輯器實例。編輯器實例可被視為將 `EditorState` 與 DOM 連接起來的中介。編輯器也是註冊自定義節點、添加監聽器和進行轉換的地方。

編輯器實例可以從 `lexical` 包中創建，並接受一個可選的配置對象，用於主題設置和其他選項：

```js
import {createEditor} from 'lexical';

const config = {
  namespace: 'MyEditor',
  theme: {
    ...
  },
  onError: console.error
};

const editor = createEditor(config);
```

當您擁有一個編輯器實例後，在準備就緒時，可以將該編輯器實例與文檔中的可編輯 `<div>` 元素關聯起來：

```js
const contentEditableElement = document.getElementById('editor');

editor.setRootElement(contentEditableElement);
```

如果要從元素中清除編輯器實例，可以傳遞 `null`。或者，如果需要，可以切換到另一個元素，只需將另一個元素引用傳遞給 `setRootElement()`。

### 操作編輯器狀態

在 Lexical 中，數據源不在 DOM 中，而是在與編輯器實例相關聯的底層狀態模型中。您可以通過調用 `editor.getEditorState()` 獲取最新的編輯器狀態。

編輯器狀態可以序列化為 JSON，編輯器實例提供了一個有用的方法來反序列化字符串化的編輯器狀態。

```js
const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());

const newEditorState = editor.parseEditorState(stringifiedEditorState);
```

### 更新編輯器狀態

儘管使用 `@lexical/rich-text` 或 `@lexical/plain-text` 幫助包時不一定需要此操作，但對於程式化內容修改以及自定義編輯器的微調仍然是相關的。

有幾種方法可以更新編輯器實例：

- 使用 `editor.update()` 觸發更新
- 通過 `editor.setEditorState()` 設置編輯器狀態
- 通過 `editor.registerNodeTransform()` 在現有更新中應用變更
- 使用 `editor.registerCommand(EXAMPLE_COMMAND, () => {...}, priority)` 的命令監聽器

更新編輯器的最常見方法是使用 `editor.update()`。調用此函數需要傳遞一個函數，以便訪問和修改底層的編輯器狀態。當開始新的更新時，當前的編輯器狀態會被克隆並作為起點。從技術上講，這意味著 Lexical 在更新期間使用了一種稱為雙緩衝的技術。這裡有一個表示當前在屏幕上顯示的編輯器狀態，還有一個表示未來變更的進行中編輯器狀態。

創建更新通常是異步過程，這允許 Lexical 在單個更新中將多個更新一起批量處理，從而提高性能。當 Lexical 準備將更新提交給 DOM 時，更新中的底層變更和變動將形成一個新的不可變的編輯器狀態。調用 `editor.getEditorState()` 會返回基於更新變更的最新編輯器狀態。

以下是如何更新編輯器實例的示例：

```js
import {
  $getRoot,
  $getSelection,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';

// 在 `editor.update` 中，您可以使用特殊的 $ 前綴的幫助函數。
// 這些函數不能在閉包外部使用，否則會報錯。
// (如果您熟悉 React，可以將其想像成有點像在 React 函數組件外部使用鉤子)。
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

**需要注意的是，核心庫 (`lexical` 包) 不會自動監聽任何命令或根據用戶事件對編輯器狀態進行更新。** 要在編輯器中看到文本和其他內容，您需要註冊[命令監聽器](https://lexical.dev/docs/concepts/commands#editorregistercommand)並在回調中更新編輯器。Lexical 提供了一些幫助包，使得將很多您可能想要的基本命令輕鬆地用於[純文本](https://lexical.dev/docs/packages/lexical-plain-text)或[富文本](https://lexical.dev/docs/packages/lexical-rich-text)體驗。

如果您想在編輯器更新時獲取通知以便做出響應，可以向編輯器添加更新監聽器，如下所示：

```js
editor.registerUpdateListener(({editorState}) => {
  // 最新的 EditorState 可以作為 `editorState` 找到。
  // 要讀取 EditorState 的內容，使用以下 API：

  editorState.read(() => {
    // 就像 editor.update() 一樣，.read() 需要一個閉包，您可以在其中使用 $ 前綴的幫助函數。
  });
});
```

### 綜合運用

這裡我們有最簡單的 Lexical 設置，包含富文本配置 (`@lexical/rich-text`)，啟用了歷史 (`@lexical/history`) 和無障礙 (`@lexical/dragon`) 功能。

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/vanilla-js?embed=1&file=src%2Fmain.ts&terminalHeight=0&ctl=1" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"></iframe>
