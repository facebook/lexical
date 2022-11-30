

# Read Mode / Edit Mode

Lexical supports two modes:

- Read mode
- Edit mode

The default behavior for Lexical is edit mode, or more accurately not read only mode. Under-the-hood, the main
implementation detail is that the `contentEditable` is being set to `"false"` or `"true"` depending on the mode.
Specific plugins can listen to the mode change too – allowing them to customize parts of the UI depending on the
mode.

## Setting the mode

In order to set the mode, this can be done on creation of the editor:

```js
const editor = createEditor({
  editable: true,
  ...
})
```

If you're using `@lexical/react` this can be done on the `initialConfig` passed to `<LexicalComposer>`:

```jsx
<LexicalComposer initialConfig={{editable: true}}>
  ...
</LexicalComposer>
```

After an editor is created, the mode can be changed imperatively:

```js
editor.setEditable(true);
```

## Reading the mode

In order to find the current mode of the editor you can use:

```js
const isEditable = editor.isEditable(); // Returns true or false
```

You can also get notified when the editor's read only mode has changed:

```js
const removeEditableListener = editor.registerEditableListener(
  (isEditable) => {
    // The editor's mode is passed in!
    console.log(isEditable);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeEditableListener();
```
