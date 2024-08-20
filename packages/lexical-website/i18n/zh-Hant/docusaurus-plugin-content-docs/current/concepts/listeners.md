# 監聽器 (Listeners)

監聽器是一種機制，使編輯器實例能夠在某些操作發生時通知使用者。所有監聽器都遵循一種反應式模式，您可以在未來某些事件發生時進行操作。所有監聽器還會返回一個函式，使您可以輕鬆地取消註冊監聽器。以下是 Lexical 目前支援的不同監聽器：

## `registerUpdateListener`

當 Lexical 將更新提交到 DOM 時收到通知。

```js
const removeUpdateListener = editor.registerUpdateListener(({editorState}) => {
  // 最新的 EditorState 可以作為 `editorState` 找到。
  // 要讀取 EditorState 的內容，可以使用以下 API：

  editorState.read(() => {
    // 就像 editor.update() 一樣，.read() 需要一個閉包，在其中可以使用
    // 以 $ 為前綴的輔助函式。
  });
});

// 當不再需要時，請不要忘記取消註冊監聽器！
removeUpdateListener();
```

更新監聽器的回呼函式會接收一個包含以下屬性的參數：

- `editorState`：最新更新的編輯器狀態
- `prevEditorState`：先前的編輯器狀態
- `tags`：一個包含所有傳遞到更新中的標籤的集合

需要注意的一件事是「瀑布」更新。這指的是在更新監聽器內安排另一個更新，如下所示：

```js
editor.registerUpdateListener(({editorState}) => {
  // 讀取 editorState 並可能獲取某些值。
  editorState.read(() => {
    // ...
  });

  // 然後安排另一個更新。
  editor.update(() => {
    // ...
  });
});
```

這種模式的問題在於，我們最終會進行兩次 DOM 更新，而我們本可以在一次 DOM 更新中完成。這可能會影響性能，這對文字編輯器非常重要。為了避免這種情況，我們建議瞭解 [Node Transforms](https://lexical.dev/docs/concepts/transforms)，這可以讓您監聽節點變更並在同一次更新中進行轉換，從而避免瀑布效應！

## `registerTextContentListener`

當 Lexical 將更新提交到 DOM 並且編輯器的文字內容與之前的狀態發生變化時收到通知。如果文字內容在更新之間沒有變化，則不會通知監聽器。

```js
const removeTextContentListener = editor.registerTextContentListener(
  (textContent) => {
    // 編輯器的最新文字內容！
    console.log(textContent);
  },
);

// 當不再需要時，請不要忘記取消註冊監聽器！
removeTextContentListener();
```

## `registerMutationListener`

當特定類型的 Lexical 節點發生變異時收到通知。變異有三種狀態：

- `created`（已創建）
- `destroyed`（已銷毀）
- `updated`（已更新）

變異監聽器非常適合追蹤特定類型節點的生命周期。它們可用於處理與特定類型節點相關的外部 UI 狀態和 UI 功能。

如果 DOM 中已有節點，且 skipInitialization 未設為 true，則監聽器將立即被調用，並且所有節點的 NodeMutation 狀態均為「created」。這可以通過 skipInitialization 選項來控制（默認為 true，以與 0.17.x 向後相容，但在 0.18.0 中將更改為 false）。

```js
const removeMutationListener = editor.registerMutationListener(
  MyCustomNode,
  (mutatedNodes, {updateTags, dirtyLeaves, prevEditorState}) => {
    // mutatedNodes 是一個 Map，其中每個鍵是 NodeKey，值是變異的狀態。
    for (let [nodeKey, mutation] of mutatedNodes) {
      console.log(nodeKey, mutation);
    }
  },
  {skipInitialization: false},
);

// 當不再需要時，請不要忘記取消註冊監聽器！
removeMutationListener();
```

## `registerEditableListener`

當編輯器的模式發生變化時收到通知。編輯器的模式可以通過 `editor.setEditable(boolean)` 來更改。

```js
const removeEditableListener = editor.registerEditableListener((editable) => {
  // 編輯器的模式會傳遞進來！
  console.log(editable);
});

// 當不再需要時，請不要忘記取消註冊監聽器！
removeEditableListener();
```

## `registerDecoratorListener`

當編輯器的裝飾物件變化時收到通知。裝飾物件包含所有 `DecoratorNode` 鍵及其裝飾值。這主要用於外部 UI 框架。

```js
const removeDecoratorListener = editor.registerDecoratorListener(
  (decorators) => {
    // 編輯器的裝飾物件會傳遞進來！
    console.log(decorators);
  },
);

// 當不再需要時，請不要忘記取消註冊監聽器！
removeDecoratorListener();
```

## `registerRootListener`

當編輯器的根 DOM 元素（Lexical 附加到的可編輯內容）發生變化時收到通知。這主要用於將事件監聽器附加到根元素。_根監聽器函式在註冊時立即執行，並在任何後續更新時執行。_

```js
const removeRootListener = editor.registerRootListener(
  (rootElement, prevRootElement) => {
    // 為新根元素添加監聽器
    // 從舊根元素移除監聽器
  },
);

// 當不再需要時，請不要忘記取消註冊監聽器！
removeRootListener();
```
