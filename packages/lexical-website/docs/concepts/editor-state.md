

# Editor State

## Why is it necessary?

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance.

While HTML is great for storing rich text content it's often "way too flexible" when it comes to text editing.
For example the following lines of content will produce equal outcome:

```html
<i><b>Lexical</b></i>
<i><b>Lex<b><b>ical</b></i>
<b><i>Lexical</i></b>
```

<details>
  <summary>See rendered version!</summary>
  <div>
    <i><b>Lexical</b></i>
    <i><b>Lex</b><b>ical</b></i>
    <b><i>Lexical</i></b>
  </div>
</details>

Of course, there are ways to normalize all these variants to a single canonical form, however this would require DOM manipulation and so re-rendering of the content. And to overcome this we can use Virtual DOM, or State.

On top of that it allows to decouple content structure from content formatting. Let's look at this example stored in HTML:

```html
<p>Why did the JavaScript developer go to the bar? <b>Because he couldn't handle his <i>Promise</i>s</b></p>
```

<figure class="text--center">
  <img src="/img/docs/state-formatting-html.drawio.svg" alt="Nested structure of the HTML state"/>
  <figcaption>Nested structure of the HTML state because of the formatting</figcaption>
</figure>

In contrast, Lexical decouples structure from formatting by offsetting this information to attributes. This allows us to have canonical document structure regardless of the order in which different styles were applied.

<figure class="text--center">
  <img src="/img/docs/state-formatting-lexical.png" alt="Flat Lexical state"/>
  <figcaption>Flat Lexical state structure</figcaption>
</figure>

## Understanding the Editor State

You can get the latest editor state from an editor by calling `editor.getEditorState()`.

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

For React it could be something like the following:

```jsx
const initialEditorState = await loadContent();
const editorStateRef = useRef(undefined);

<LexicalComposer initialConfig={{
  editorState: initialEditorState
}}>
  <LexicalRichTextPlugin />
  <LexicalOnChangePlugin onChange={(editorState) => {
    editorStateRef.current = editorState;
  }} />
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

:::tip

For a deep dive into how state updates work, check out [this blog post](https://dio.la/article/lexical-state-updates) by Lexical contributor [@DaniGuardiola](https://twitter.com/daniguardio_la).

:::

The most common way to update the editor is to use `editor.update()`. Calling this function
requires a function to be passed in that will provide access to mutate the underlying
editor state. When starting a fresh update, the current editor state is cloned and
used as the starting point. From a technical perspective, this means that Lexical leverages a technique
called double-buffering during updates. There's the "current" frozen editor state to represent what was
most recently reconciled to the DOM, and another work-in-progress "pending" editor state that represents
future changes for the next reconciliation.

Reconciling an update is typically an async process that allows Lexical to batch multiple synchronous
updates of the editor state together in a single update to the DOM – improving performance. When
Lexical is ready to commit the update to the DOM, the underlying mutations and changes in the update
batch will form a new immutable editor state. Calling `editor.getEditorState()` will then return the
latest editor state based on the changes from the update.

Here's an example of how you can update an editor instance:

```js
import {$getRoot, $getSelection} from 'lexical';
import {$createParagraphNode} from 'lexical';

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

## When are Listeners, Transforms, and Commands called?

There are several types of callbacks that can be registered with the editor that are related to
updates of the Editor State.

| Callback Type | When It's Called |
| -- | -- |
| Update Listener | After reconciliation |
| Mutation Listener | After reconciliation |
| Node Transform | During `editor.update()`, after the callback finishes, if any instances of the node type they are registered for were updated |
| Command | As soon as the command is dispatched to the editor (called from an implicit `editor.update()`) |

## Synchronous reconciliation with discrete updates

While commit scheduling and batching are normally what we want, they can sometimes get in the way.

Consider this example: you're trying to manipulate an editor state in a server context and then persist it in a database.

```js
editor.update(() => {
  // manipulate the state...
});

saveToDatabase(editor.getEditorState().toJSON());
```

This code will not work as expected, because the `saveToDatabase` call will happen before the state has been committed.
The state that will be saved will be the same one that existed before the update.

Fortunately, the `discrete` option for `LexicalEditor.update` forces an update to be immediately committed.

```js
editor.update(() => {
  // manipulate the state...
}, {discrete: true});

saveToDatabase(editor.getEditorState().toJSON());
```

### Cloning state

Lexical state can be cloned, optionally with custom selection. One of the scenarios where you'd want to do it
is setting editor's state but not forcing any selection:

```js
// Passing `null` as a selection value to prevent focusing the editor
editor.setEditorState(editorState.clone(null));
```
