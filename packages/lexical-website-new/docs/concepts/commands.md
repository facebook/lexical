---
sidebar_position: 2
---

# Commands

Commands are a very powerful feature of Lexical that let you register listeners for events like `INSERT_TEXT_COMMAND` or `KEY_TAB_COMMAND` and contextually react to them wherever you want.

This is a common pattern for building [`Toolbars`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin.jsx) or complex `Plugins` and `Nodes` such as the [`TablePlugin`](https://github.com/facebook/lexical/tree/main/packages/lexical-table) which require custom behavior for `selection`, `keyboard events`, and more.

When registering a `command` you supply a `priority` and can return `true` to mark it as "handled" which stops other listeners from receiving the event. And if they're not handled explicitely by you, they're likely handled by default in the [`RichTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.js) or the [`PlainTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-plain-text/src/index.js).

## `createCommand(...)`

You can check out all of the existing commands in [`LexicalCommands.js`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalCommands.js), but if you'd like to create a custom command for your own use case, you can use the typed `createCommand(...)` function.

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

Commands can be dispatched from anywhere you have access to the `editor` such as a Toolbar Button, an event listener, or a Plugin, but most of the core commands are dispatched from [`LexicalEvents.js`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.js).

```js
editor.dispatchCommand(command, payload);
```

The `payload`s are typed via the `createCommand(...)` API, but they're usually a DOM `event` for commands dispatched from an event listener.

Here are some real examples from [`LexicalEvents.js`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.js).

```js
editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
// ...
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
```

And another example from the [`ToolbarPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin.jsx) in our Playground.

```js
const formatBulletList = () => {
  editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
};
```

Which is later received in [`useList`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-react/src/shared/useList.js#L65).

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

You can register a command from anywhere you have access to the `editor` object, but it's important that you remember to clean up the listener with it's remove listener callback when it's no longer needed.

```js
const removeListener = editor.registerCommand(
  COMMAND,
  (payload) => boolean, // Return true to stop propagation.
  priority,
);
// ...
removeListener(); // Cleans up the listener.
```

Returning in a React `useEffect` is a common pattern for easy clean-up.

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

And as seen above and below, `registerCommand`'s callback can return `true` to signal to the other listeners that the command has been handled and propagation will be stopped.

Here's a simplified example of handling a `KEY_TAB_COMMAND` from the [`RichTextPlugin`](https://github.com/facebook/lexical/blob/76b28f4e2b70f1194cc8148dcc30c9f9ec61f811/packages/lexical-rich-text/src/index.js#L625), which is used to dispatch a `OUTDENT_CONTENT_COMMAND` or `INDENT_CONTENT_COMMAND`.

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

Note that the same `KEY_TAB_COMMAND` command is registered by [`LexicalTableSelectionHelpers.js`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-table/src/LexicalTableSelectionHelpers.js#L733), which handles moving focus to the next or previous cell within a `Table`, but the priority is the highest it can be (`4`) because this behavior is very important.
