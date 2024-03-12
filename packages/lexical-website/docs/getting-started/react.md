---
sidebar_position: 2
---

# Getting Started with React

## Video Tutorials

For a detailed walkthrough of setting up a basic editor with Lexical in React, check out these videos:

* [Getting Started with Lexical & React](https://www.youtube.com/watch?v=qIqxvk2qcmo)
* [Themes, Nodes, and Rich Text](https://www.youtube.com/watch?v=pIBUFYd9zJY)
* [Headings, Lists, Toolbar](https://www.youtube.com/watch?v=5sRh_WXw0WI)
* [Creating Nodes and Plugins](https://www.youtube.com/watch?v=abZNazybzvs)

Keep in mind that some of these videos may be partially outdated as we do not update them as often as textual documentation.

## Creating Basic Rich Text Editor

To simplify Lexical integration with React we provide the `@lexical/react` package that wraps Lexical APIs with React components so the editor itself as well as all the plugins now can be easily composed using JSX.
Furthermore, you can lazy load plugins if desired, so you don't pay the cost for plugins until you actually use them.

To start, install `lexical` and `@lexical/react`:

```
npm install --save lexical @lexical/react
```

Below is an example of a basic rich text editor using `lexical` and `@lexical/react`.

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {AutoFocusPlugin} from '@lexical/react/LexicalAutoFocusPlugin';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // Theme styling goes here
  ...
}

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error) {
  console.error(error);
}

function Editor() {
  const initialConfig = {
    namespace: 'MyEditor',
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <AutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## Adding UI to control text formatting

Out of the box Lexical doesn't provide any type of UI as it's not a ready to use editor but rather a framework for creation of your own editor.
Below you can find an example of the integration from the previous chapter that now features 2 new plugins:
- `ToolbarPlugin` - renders UI to control text formatting
- `TreeViewPlugin` - renders debug view below the editor so we can see its state in real time

However no UI can be created w/o CSS and Lexical is not an exception here. Pay attention to `ExampleTheme.ts` and how it's used in this example, with corresponding styles defined in `styles.css`.

<iframe width="100%" height="400" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/react-rich?embed=1&file=src%2FApp.tsx&terminalHeight=0"></iframe>


## Saving Lexical State

:::tip
While we attempt to write our own plugin here for demonstration purposes, in real life projects it's better to opt for [LexicalOnchangePlugin](/docs/react/plugins#lexicalonchangeplugin).
:::

Now that we have a simple editor in React, the next thing we might want to do is access the content of the editor to, for instance,
save it in a database. We can do this via the an [update listener](https://lexical.dev/docs/concepts/listeners#registerupdatelistener), which will execute every time the editor state changes and provide us with the latest state. In React, we typically use the plugin system to set up listeners like this, since it provides us easy access to the LexicalEditor instance via a React Context. So, let's write our own plugin that notifies us when the editor updates.

```jsx
// When the editor changes, you can get notified via the
// OnChangePlugin!
function MyOnChangePlugin({ onChange }) {
  // Access the editor through the LexicalComposerContext
  const [editor] = useLexicalComposerContext();
  // Wrap our listener in useEffect to handle the teardown and avoid stale references.
  useEffect(() => {
    // most listeners return a teardown function that can be called to clean them up.
    return editor.registerUpdateListener(({editorState}) => {
      // call onChange here to pass the latest state up to the parent.
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}
```

Now, we can implement this in our editor and save the EditorState in a React state variable:

```jsx
function MyOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    setEditorState(editorState);
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RichTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
      <MyOnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );
}

```
Ok, so now we're saving the EditorState object in a React state variable, but we can't save a JavaScript object to our database - so how do we persist the state so we can load it later? We need to serialize it to a storage format. For this purpose (among others) Lexical provides several serialization APIs that convert EditorState to a string that can be sent over the network and saved to a database. Building on our previous example, we can do that this way:

```jsx
function MyOnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
  return null;
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    // Call toJSON on the EditorState object, which produces a serialization safe string
    const editorStateJSON = editorState.toJSON();
    // However, we still have a JavaScript object, so we need to convert it to an actual string with JSON.stringify
    setEditorState(JSON.stringify(editorStateJSON));
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      {/*...*/}
      <MyOnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );

```

From there, it's straightforward to wire up a submit button or some other UI trigger that will take the state from the React state variable and send it to a server for storage in a database.

One important thing to note: Lexical is generally meant to be uncontrolled, so avoid trying to pass the EditorState back into Editor.setEditorState or something along those lines.
