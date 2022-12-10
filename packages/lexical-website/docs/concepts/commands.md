

# Commands

Commands are a very powerful feature of Lexical that lets you register listeners for events like `KEY_ENTER_COMMAND` or `KEY_TAB_COMMAND` and contextually react to them _wherever_ & _however_ you'd like.

This pattern is useful for building [`Toolbars`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) or complex `Plugins` and `Nodes` such as the [`TablePlugin`](https://github.com/facebook/lexical/tree/main/packages/lexical-table) which require special handling for `selection`, `keyboard events`, and more.

When registering a `command` you supply a `priority` and can return `true` to mark it as "handled", which stops other listeners from receiving the event. If a command isn't handled explicitly by you, it's likely handled by default in the [`RichTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-rich-text/src/index.ts) or the [`PlainTextPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-plain-text/src/index.ts).

## `createCommand(...)`

You can view all of the existing commands in [`LexicalCommands.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalCommands.ts), but if you need a custom command for your own use case check out the typed `createCommand(...)` function.

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

Commands can be dispatched from anywhere you have access to the `editor` such as a Toolbar Button, an event listener, or a Plugin, but most of the core commands are dispatched from [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts).

```js
editor.dispatchCommand(command, payload);
```

The `payload`s are typed via the `createCommand(...)` API, but they're usually a DOM `event` for commands dispatched from an event listener.

Here are some real examples from [`LexicalEvents.ts`](https://github.com/facebook/lexical/blob/main/packages/lexical/src/LexicalEvents.ts).

```js
editor.dispatchCommand(KEY_ARROW_LEFT_COMMAND, event);
// ...
editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
```

And another example from the [`ToolbarPlugin`](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx) in our Playground.

```js
const formatBulletList = () => {
  editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
};
```

Which is later handled in [`useList`](https://github.com/facebook/lexical/blob/1f62ace08e15d55515f3750840133efecd6d7d01/packages/lexical-react/src/shared/useList.js#L65) to insert the list into the editor.

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

You can register a command from anywhere you have access to the `editor` object, but it's important that you remember to clean up the listener with its remove listener callback when it's no longer needed.

```js
const removeListener = editor.registerCommand(
  COMMAND,
  (payload) => boolean, // Return true to stop propagation.
  priority,
);
// ...
removeListener(); // Cleans up the listener.
```

A common pattern for easy clean-up is returning a `registerCommand` call within a React `useEffect`.

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
