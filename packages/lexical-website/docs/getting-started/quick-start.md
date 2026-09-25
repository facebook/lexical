---
sidebar_position: 1
---

import GettingStartedExample from '@site/src/components/GettingStartedExample';

# Quick Start (Vanilla JS)

Build a Lexical editor by composing [extensions](../extensions/intro.md). An
extension bundles a feature's nodes, configuration, and behavior, including any
other extensions it needs. The same extensions work with or without React; for
React's mounting and UI components, see [Getting Started with React](react.md).

## Install Lexical

```sh
npm install lexical @lexical/extension @lexical/rich-text @lexical/history @lexical/clipboard
```

Keep `lexical` and all `@lexical/*` packages on the same version. Your application
must resolve [one copy of each package](../concepts/one-lexical-per-app.md).

## Creating an editor and using it

Start with an editable element:

```html
<div id="editor" contenteditable="true" role="textbox"
  aria-label="Rich text editor" aria-multiline="true"></div>
```

Define one root extension at module scope, then build and attach the editor:

```js
import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {$createParagraphNode, $createTextNode, $getRoot, defineExtension} from 'lexical';

const appExtension = defineExtension({
  name: 'MyEditor',
  namespace: 'MyEditor',
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ClipboardDOMImportExtension,
  ],
  theme: {
    paragraph: 'editor-paragraph',
    text: {bold: 'editor-text-bold', italic: 'editor-text-italic'},
  },
  $initialEditorState() {
    $getRoot().append(
      $createParagraphNode().append($createTextNode('Hello world')),
    );
  },
});

const editor = buildEditorFromExtensions(appExtension);
editor.setRootElement(document.getElementById('editor'));
```

`RichTextExtension` installs editing commands, heading and quote nodes, and its
dependencies, including Dragon speech recognition support. `HistoryExtension`
adds undo and redo. `ClipboardDOMImportExtension` routes HTML pasted from other
applications through the [DOM import rules](../serialization/dom-import.md)
provided by your extensions.

You do not need to register those nodes or behaviors again. Dependencies shared
by multiple extensions are included once. The core `lexical` package alone does
not provide a complete editing experience; the feature extensions supply it.

Add CSS for the theme classes:

```css
.editor-paragraph { margin: 0 0 1em; }
.editor-text-bold { font-weight: bold; }
.editor-text-italic { font-style: italic; }
```

See [Theming](theming.md) for more options. Errors throw by default; supply
`onError` on your root extension only if your application needs custom handling.

### Configuring features

Use `configExtension` to override a dependency's configuration. For example, to
change the interval used to group typing into undo steps, replace
`HistoryExtension` in `dependencies` with:

```js
import {configExtension} from 'lexical';

configExtension(HistoryExtension, {delay: 300})
```

Choose the extension graph when creating the editor. See
[Included Extensions](../extensions/included-extensions.md) for more features and
[Creating an Extension](creating-plugin.md) to add your own.

### Cleanup

`editor.setRootElement(null)` detaches the editable element; you can attach
another element later. When the editor is no longer needed, dispose it:

```js
editor.dispose();
```

Disposal detaches the root and runs the cleanup functions returned by extensions.
Call it when your view is removed, including when replacing the editor during
hot module reload.

## Working with Editor States

Lexical's source of truth is its immutable `EditorState`, which contains the node
tree and selection. The editor reconciles that state to the DOM.

Functions prefixed with `$`, such as `$getRoot()`, need a synchronous Lexical read
or update context. Use `editor.read('latest', ...)` for reading and `editor.update()` for
changes. Initialization callbacks, node transforms, and command listeners also
run in an update context.

```js
const text = editor.read('latest', () => $getRoot().getTextContent());

editor.update(() => {
  $getRoot().append(
    $createParagraphNode().append($createTextNode('Another paragraph')),
  );
});
```

The update callback runs synchronously, but Lexical normally batches DOM commits.
`editor.read('latest', ...)` reads the latest committed state without flushing
pending updates. This is usually the mode you want. Keep `$` calls inside the
callback, and do not use `await` inside it.

If you need to read the result immediately after a programmatic update, use
`'force-commit'` to flush pending updates first:

```js
const updatedText = editor.read('force-commit', () => $getRoot().getTextContent());
```

Use this only when you need the synchronous commit; ordinary reads can leave
Lexical's update batching intact.

### Saving and restoring state

`toJSON()` returns a JSON-compatible object; `JSON.stringify()` turns it into a
string. To save the latest committed state:

```js
const savedState = editor.read('latest', () =>
  JSON.stringify(editor.getEditorState().toJSON()),
);
```

To initialize an editor from saved JSON, set `$initialEditorState: savedState` on
its root extension instead of the initialization function. To explicitly replace
an existing editor's document:

```js
editor.setEditorState(editor.parseEditorState(savedState));
```

See [Editor State](../concepts/editor-state.md) for details.

### Responding to changes

Put listeners in an extension's `register` method and return their cleanup
function. For example, add this extension to your root's `dependencies`:

```js
const LogChangesExtension = defineExtension({
  name: 'LogChanges',
  register(editor) {
    return editor.registerUpdateListener(({editorState, dirtyElements, dirtyLeaves}) => {
      // Ignore updates that only change the selection.
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }
      console.log(JSON.stringify(editorState.toJSON(true)));
    });
  },
});
```

Use a [node transform](../concepts/transforms.md) to change content in response to
an edit. An update listener observes committed changes; starting another update
inside it adds an unnecessary reconciliation.

## Putting it together

This runnable example uses one root extension for rich text, HTML paste, history,
initial content, and a JSON debug view. The view uses `editorState.toJSON(true)`
to omit fields that parsing restores to their default values, and keeps the JSON
indented for readability:

<GettingStartedExample example="vanilla-js" />
