# 指令

指令是 Lexical 的一個非常強大的功能，它允許你為像 `KEY_ENTER_COMMAND` 或 `KEY_TAB_COMMAND` 這樣的事件註冊監聽器，並根據上下文在你希望的 _任何地方_ 和 _任何方式_ 對它們做出反應。

這種模式對於構建 [`工具列`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) 或複雜的 `插件` 和 `節點`（例如需要特殊處理的 [`TablePlugin`](https://github.com/facebook/lexical/tree/main/packages/lexical-table)）非常有用，這些通常需要對 `選擇`、`鍵盤事件` 等進行特殊處理。

當註冊一個 `command` 時，你需要提供一個 `priority`，並可以返回 `true` 以標記為“已處理”，這樣可以阻止其他監聽器接收該事件。如果你沒有明確處理一個指令，它很可能會被 [`RichTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.ts) 或 [`PlainTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-plain-text/src/index.ts) 默認處理。

## `createCommand(...)`

你可以在 [`LexicalCommands.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalCommands.ts) 中查看所有現有的指令，但如果你需要為自己的使用情境創建自定義指令，可以參考類型化的 `createCommand(...)` 函數。

```js
const HELLO_WORLD_COMMAND: LexicalCommand<string> = createCommand();

editor.dispatchCommand(HELLO_WORLD_COMMAND, 'Hello World!');

editor.registerCommand(
  HELLO_WORLD_COMMAND,
  (payload: string) => {
    console.log(payload); // Hello World!
    return false;
  },
  LowPriority,
);
```

## `editor.dispatchCommand(...)`

指令可以從任何可以訪問 `editor` 的地方派發，例如工具列按鈕、事件監聽器或插件，但大多數核心指令是從 [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts) 中派發的。

```js
editor.dispatchCommand(command, payload);
```

`payload` 的類型由 `createCommand(...)` API 確定，但通常對於從事件監聽器派發的指令，它們是 DOM `event`。

以下是來自 [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts) 的一些實際範例。

```js
editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
// ...
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
```

還有來自我們 Playground 的 [`ToolbarPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) 的另一個範例。

```js
const formatBulletList = () => {
  editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
};
```

這些指令稍後會在 [`useList`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-react/src/shared/useList.js#L65) 中處理，將列表插入編輯器中。

```js
editor.registerCommand(
  INSERT_UNORDERED_LIST_COMMAND,
  () => {
    insertList(editor, 'ul');
    return true;
  },
  COMMAND_PRIORITY_LOW,
);
```

## `editor.registerCommand(...)`

你可以在任何可以訪問 `editor` 對象的地方註冊指令，但重要的是當指令不再需要時，記得使用其移除監聽器的回調來清理監聽器。

```js
const removeListener = editor.registerCommand(
  COMMAND,
  (payload) => boolean, // 返回 true 以停止傳播。
  priority,
);
// ...
removeListener(); // 清理監聽器。
```

一個常見的簡便清理模式是在 React 的 `useEffect` 中返回 `registerCommand` 調用。

```jsx
useEffect(() => {
  return editor.registerCommand(
    TOGGLE_LINK_COMMAND,
    (payload) => {
      const url: string | null = payload;
      setLink(url);
      return true;
    },
    COMMAND_PRIORITY_EDITOR,
  );
}, [editor]);
```

如上所述和下面所示，`registerCommand` 的回調可以返回 `true`，以向其他監聽器發送指令已被處理的信號，並且傳播將被停止。

以下是處理 [`RichTextPlugin`](https://github.com/facebook/lexical/blob/76b28f4e2b70f1194cc8148dcc30c9f9ec61f811/packages/lexical-rich-text/src/index.js#L625) 中 `KEY_TAB_COMMAND` 的簡化範例，這個指令用於派發 `OUTDENT_CONTENT_COMMAND` 或 `INDENT_CONTENT_COMMAND`。

```js
editor.registerCommand(
  KEY_TAB_COMMAND,
  (payload) => {
    const event: KeyboardEvent = payload;
    event.preventDefault();
    return editor.dispatchCommand(
      event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
    );
  },
  COMMAND_PRIORITY_EDITOR,
);
```

注意，相同的 `KEY_TAB_COMMAND` 指令也由 [`LexicalTableSelectionHelpers.js`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-table/src/LexicalTableSelectionHelpers.js#L733) 註冊，它處理將焦點移到 `Table` 中的下一個或上一個單元格，但優先級是最高的（`4`），因為這種行為非常重要。
