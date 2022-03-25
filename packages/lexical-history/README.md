# `@lexical/history`

This package contains history helpers for Lexical.

### Methods

#### `registerHistory`

Registers necessary listeners to manage undo/redo history stack and related editor commands. It returns `unregister` callback that cleans up all listeners and should be called on editor unmount.

```js
function registerHistory(
  editor: LexicalEditor,
  externalHistoryState: HistoryState,
  delay: number,
): () => void
```

### Commands

History package handles `undo`, `redo` and `clearHistory` commands. It also triggers `canUndo` and `canRedo` commands when history state is changed. These commands could be used to work with history state:

```jsx
<Toolbar>
  <Button onClick={() => editor.execCommand('undo')}>Undo</Button>
  <Button onClick={() => editor.execCommand('redo')}>Redo</Button>
</Toolbar>
```
