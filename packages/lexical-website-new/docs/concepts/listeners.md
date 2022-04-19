---
sidebar_position: 3
---

# Listeners

Listeners are a mechanism that lets the Editor instance inform the user when a certain operation has occured. All listeners follow a reactive pattern where you can do an operation upon something happening in the future. All listeners also return a fuction that easily allows for the
listener to be unregistered. Below are the different listeners that Lexical supports today:

## `registerUpdateListener`

Get notified when Lexical commits an update to the DOM.

```js
const removeUpdateListener = editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});

// Do not forget to unregister the listener when no longer needed!
removeUpdateListener();
```

The update listener callbacks receives a single argument containing the follow properties:

- `editorState` the latest updated Editor State
- `prevEditorState` the previous Editor State
- `tags` a Set of all tags that were passed to the update

## `registerTextContentListener`

Get notified when Lexical commits an update to the DOM and the text content of the editor changes from
the previous state of the editor. If the text content is the same between updates, no notifications to
the listeners will happen.

```js
const removeTextContentListener = editor.registerTextContentListener(
  (textContent) => {
    // The latest text content of the editor!
    console.log(textContent);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeTextContentListener();
```

## `registerMutationListener`

Get notified when a specific type of Lexical node has been mutated. There are three states of mutation:

- `created`
- `destroyed`
- `updated`

Mutation listeners are great for tracking the lifecycle of specific types of node. They can be used to
handle external UI state and UI features relating to specific types of node.

```js
const removeMutationListener = editor.registerMutationListener(
  MyCustomNode,
  (mutatedNodes) => {
    // mutatedNodes is a Map where each key is the NodeKey, and the value is the state of mutation.
    for (let [nodeKey, mutation] of mutatedNodes) {
      console.log(nodeKey, mutation)
    }
  },
);

// Do not forget to unregister the listener when no longer needed!
removeMutationListener();
```

## `registerReadOnlyListener`

Get notified when the editor's read only mode has changed. The editor's read only mode can be changed
via `editor.setReadOnly(boolean)`.

```js
const removeReadOnlyListener = editor.registerReadOnlyListener(
  (readOnly) => {
    // The editor's read only mode is passed in!
    console.log(readOnly);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeReadOnlyListener();
```

## `registerDecoratorListener`

Get notified when a the editor's decorator object changes. The decorator object contains
all `DecoratorNode` keys -> their decorated value. This is primarily used with external
UI frameworks. 

```js
const removeDecoratorListener = editor.registerDecoratorListener(
  (decorators) => {
    // The editor's decorators object is passed in!
    console.log(decorators);
  },
);

// Do not forget to unregister the listener when no longer needed!
removeDecoratorListener();
```