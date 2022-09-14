---
sidebar_position: 7
---

# Editor State

## Understanding the Editor State

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance. You can get the latest
editor state from an editor by calling `editor.getEditorState()`.

Editor states have two phases:

- During an update they can be thought of as "mutable". See "Updating state" below to
  mutate an editor state.
- After an update, the editor state is then locked and deemed immutable from there on. This
  editor state can therefore be thought of as a "snapshot".

Editor states contain two core things:

- The editor node tree (starting from the root node).
- The editor selection (which can be null).

Editor states are serializable to JSON, and the editor instance provides a useful method
to deserialize stringified editor states.

Here's an example of how you can initialize editor with some state and then persist it:

```js
// Get editor initial state (e.g. loaded from backend)
const loadContent = async () => {
  // 'empty' editor
  const value = '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

  return value;
}

const initialEditorState = await loadContent();
const editor = createEditor(...);
registerRichText(editor, initialEditorState);

...

// Handler to store content (e.g. when user submits a form)
const onSubmit = () => {
  await saveContent(JSON.stringify(editor.getEditorState()));
}
```

For React it could be something following:

```jsx
const initialEditorState = await loadContent();
const editorStateRef = useRef();

<LexicalComposer initialConfig={{
  editorState: initialEditorState
}}>
  <LexicalRichTextPlugin />
  <LexicalOnChangePlugin onChange={editorState => editorStateRef.current = editorState} />
  <Button label="Save" onPress={() => {
    if (editorStateRef.current) {
      saveContent(JSON.stringify(editorStateRef.current))
    }
  }} />
</LexicalComposer>
```

Note that Lexical uses `initialConfig.editorState` only once (when it's being initialized) and passing different value later
won't be reflected in editor. See "Update state" below for proper ways of updating editor state.

## Updating state

The most common way to update the editor is to use `editor.update()`. Calling this function
requires a function to be passed in that will provide access to mutate the underlying
editor state. When starting a fresh update, the current editor state is cloned and
used as the starting point. From a technical perspective, this means that Lexical leverages a technique
called double-buffering during updates. There's an editor state to represent what is current on
the screen, and another work-in-progress editor state that represents future changes.

Creating an update is typically an async process that allows Lexical to batch multiple updates together in
a single update – improving performance. When Lexical is ready to commit the update to
the DOM, the underlying mutations and changes in the update will form a new immutable
editor state. Calling `editor.getEditorState()` will then return the latest editor state
based on the changes from the update.

Here's an example of how you can update an editor instance:

```js
import {$getRoot, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical/PargraphNode';

// Inside the `editor.update` you can use special $ prefixed helper functions.
// These functions cannot be used outside the closure, and will error if you try.
// (If you're familiar with React, you can imagine these to be a bit like using a hook
// outside of a React function component).
editor.update(() => {
  // Get the RootNode from the EditorState
  const root = $getRoot();

  // Get the selection from the EditorState
  const selection = $getSelection();

  // Create a new ParagraphNode
  const paragraphNode = $createParagraphNode();

  // Create a new TextNode
  const textNode = $createTextNode('Hello world');

  // Append the text node to the paragraph
  paragraphNode.append(textNode);

  // Finally, append the paragraph to the root
  root.append(paragraphNode);
});
```

Another way to set state is `setEditorState` method, which replaces current state with the one passed as an argument.

Here's an example of how you can set editor state from a stringified JSON:

```js
const editorState = editor.parseEditorState(editorStateJSONString);
editor.setEditorState(editorState);
```

## State update listener

If you want to know when the editor updates so you can react to the changes, you can add an update
listener to the editor, as shown below:

```js
editor.registerUpdateListener(({editorState}) => {
  // The latest EditorState can be found as `editorState`.
  // To read the contents of the EditorState, use the following API:

  editorState.read(() => {
    // Just like editor.update(), .read() expects a closure where you can use
    // the $ prefixed helper functions.
  });
});
```

### Cloning state

Lexical state can be cloned, optionally with custom selection. One of the scenarios where you'd want to do it
is setting editor's state but not forcing any selection:

```js
// Passing `null` as a selection value to prevent focusing the editor
editor.setEditorState(editorState.clone(null));
```
