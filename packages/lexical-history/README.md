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

History package handles `UNDO_COMMAND`, `REDO_COMMAND` and `CLEAR_HISTORY_COMMAND` commands. It also triggers `CAN_UNDO_COMMAND` and `CAN_REDO_COMMAND` commands when history state is changed. These commands could be used to work with history state:

```jsx
import {UNDO_COMMAND, REDO_COMMAND} from 'lexical';

<Toolbar>
  <Button onClick={() => editor.dispatchCommand(UNDO_COMMAND)}>Undo</Button>
  <Button onClick={() => editor.dispatchCommand(REDO_COMMAND)}>Redo</Button>
</Toolbar>;
```

### Merging history

Every `editor.update()` call creates a new history entry by default. More about that [here](https://lexical.dev/docs/concepts/editor-state#updating-state).  
If an update should be merged with existing history state (eg. instead of counting as a seperate step in an undo stack), `history-merge` tag should be passed.  

```ts
editor.update(
  () => {
    // update body
  },
  {
    tag: 'history-merge', // prevent this action from being recorded in the undo stack
  },
);
```
Note that [Node transforms](https://lexical.dev/docs/concepts/transforms) merge history by default and do not create any new history entries.
