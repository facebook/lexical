---
sidebar_position: 2
---

# Getting Started with React

## Video Tutorials

For a detailed walkthrough of setting up a basic editor with Lexical in React, check out these videos:

[Getting Started with Lexical & React](https://www.youtube.com/watch?v=qIqxvk2qcmo)

[Themes, Nodes, and Rich Text](https://www.youtube.com/watch?v=pIBUFYd9zJY)

[Headings, Lists, Toolbar](https://www.youtube.com/watch?v=5sRh_WXw0WI)

[Creating Nodes and Plugins](https://www.youtube.com/watch?v=abZNazybzvs)

## Code Sample

Install `lexical` and `@lexical/react`:

```
npm install --save lexical @lexical/react
```

Below is an example of a basic plain text editor using `lexical` and `@lexical/react` ([try it yourself](https://codesandbox.io/s/lexical-plain-text-example-g932e)).

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {PlainTextPlugin} from '@lexical/react/LexicalPlainTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {OnChangePlugin} from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

const theme = {
  // Theme styling goes here
  ...
}

// Lexical React plugins are React components, which makes them
// highly composable. Furthermore, you can lazy load plugins if
// desired, so you don't pay the cost for plugins until you
// actually use them.
function MyCustomAutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Focus the editor when the effect fires!
    editor.focus();
  }, [editor]);

  return null;
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
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
}
```

Now that we have a simple editor in React, the next thing we might want to do is access the content of the editor to, for instance,
save it in a database. We can do this via the an [update listener](https://lexical.dev/docs/concepts/listeners#registerupdatelistener), which will execute every time the editor state changes and provide us with the latest state. In React, we typically use the plugin system to set up listeners like this, since it provides us easy access to the LexicalEditor instance via a React Context. So, let's write our own plugin that notifies us when the editor updates.

```jsx
// When the editor changes, you can get notified via the
// OnChangePlugin!
function OnChangePlugin({ onChange }) {
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

}
```

Now, we can implement this in our editor and save the EditorState in a React state variable:

```jsx
function OnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
}

function Editor() {
  // ...

  const [editorState, setEditorState] = useState();
  function onChange(editorState) {
    setEditorState(editorState);
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <PlainTextPlugin
        contentEditable={<ContentEditable />}
        placeholder={<div>Enter some text...</div>}
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
      <OnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );
}

```
Ok, so now we're saving the EditorState object in a React state variable, but we can't save a JavaScript object to our database - so how do we persist the state so we can load it later? We need to serialize it to a storage format. For this purpose (among others) Lexical provides several serialization APIs that convert EditorState to a string that can be sent over the network and saved to a database. Building on our previous example, we can do that this way:

```jsx
function OnChangePlugin({ onChange }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      onChange(editorState);
    });
  }, [editor, onChange]);
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
      <OnChangePlugin onChange={onChange}/>
    </LexicalComposer>
  );

```

From there, it's straightforward to wire up a submit button or some other UI trigger that will take the state from the React state variable and send it to a server for storage in a database.

One important thing to note: Lexical is generally meant to be uncontrolled, so avoid trying to pass the EditorState back into Editor.setEditorState or something along those lines.
