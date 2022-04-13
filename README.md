# Lexical

> Note: Lexical is currently in early development and APIs and packages are likely to change quite often.

Lexical is an extensible JavaScript web text-editor framework with an emphasis on reliability, accessibility and performance. Lexical aims to provide a best-in-class developer experience, so you can easily prototype and build features with confidence. Combined with a highly extensible architecture, Lexical allows developers to create unique text editing experiences that scale in size and functionality.

The core of Lexical is a dependency-free text editor engine that allows for powerful, simple and complex,
editor implementations to be built on top. Lexical's engine provides three main parts:

- editor instances that each attach to a single content editable element.
- a set of editor states that represent the current and pending states of the editor at any given time.
- a DOM reconciler that takes a set of editor states, diffs the changes, and updates the DOM according to their state.

By design, the core of Lexical tries to be as minimal as possible.
Lexical doesn't directly concern itself with things that monolithic editors tend to do – such as UI components, toolbars or rich-text features and markdown. Instead
the logic for those features can be included via a plugin interface and used as and when they're needed. This ensures great extensibilty and keeps code-sizes
to a minimal – ensuring apps only pay the cost for what they actually import.

For React apps, Lexical has tight intergration with React 18+ via the optional `@lexical/react` package. This package provides
production-ready utility functions, helpers and React hooks that make it seemless to create text editors within React.

## Getting started with React

Install `lexical` and `@lexical/react`:

```
npm install --save lexical @lexical/react
```

Below is an example of a basic plain text editor using `lexical` and `@lexical/react` ([try it yourself](https://codesandbox.io/s/lexical-plain-text-example-g932e)).

```jsx
import {$getRoot, $getSelection} from 'lexical';
import {useEffect} from 'react';

import LexicalComposer from '@lexical/react/LexicalComposer';
import LexicalPlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

const theme = {
  // Theme styling goes here
  ...
}

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
function onChange(editorState) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();

    console.log(root, selection);
  });
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
    theme,
    onError,
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <LexicalPlainTextPlugin
        contentEditable={<LexicalContentEditable />}
        placeholder={<div>Enter some text...</div>}
      />
      <LexicalOnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## Working with Lexical

This section covers how to use Lexical, independently of any framework or library. For those intending to use Lexical in their React applications,
it's advisable to [check out the source-code for the hooks that are shipped in `@lexical/react`](https://github.com/facebook/lexical/tree/main/packages/lexical-react/src).

### Creating an editor and using it

When you work with Lexical, you normally work with a single editor instance. An editor instance can be thought of as the one responsible
for wiring up an EditorState with the DOM. The editor is also the place where you can register custom nodes, add listeners, and transforms.

An editor instance can be created from the `lexical` package and accepts an optional configuration object that allows for theming and other options:

```js
import {createEditor} from 'lexical';

const config = {
  theme: {
    ...
  },
};

const editor = createEditor(config);
```

Once you have an editor instance, when ready, you can associate the editor instance with a content editable `<div>` element in your document:

```js
const contentEditableElement = document.getElementById('editor');

editor.setRootElement(contentEditableElement);
```

If you want to clear the editor instance from the element, you can pass `null`. Alternatively, you can switch to another element if need be,
just pass an alternative element reference to `setRootElement()`.

### Understanding the Editor State

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance. You can get the latest
editor state from an editor by calling `editor.getEditorState()`.

Editor states have two phases:

- During an update they can be thought of as "mutable". See "Updating an editor" below to
  mutate an editor state.
- After an update, the editor state is then locked and deemed immutable from there one. This
  editor state can therefore be thought of as a "snapshot".

Editor states contain two core things:

- The editor node tree (starting from the root node).
- The editor selection (which can be null).

Editor states are serializable to JSON, and the editor instance provides a useful method
to deserialize stringified editor states.

```js
const stringifiedEditorState = JSON.stringify(editor.getEditorState().toJSON());

const newEditorState = editor.parseEditorState(stringifiedEditorState);
```

### Updating an editor

There are a few ways to update an editor instance:

- Trigger an update with `editor.update()`
- Setting the editor state via `editor.setEditorState()`
- Applying a change as part of an existing update via `editor.registerNodeTransform()`
- Using a command listener with `editor.registerCommand( () => {...}, priority)`

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
import {$getRoot, $getSelection, $createParagraphNode} from 'lexical';

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

### Creating custom Lexical nodes

- [Creating custom decorator nodes](https://github.com/facebook/lexical/blob/main/examples/decorators.md)

## Contributing to Lexical

1. Clone this repository

2. Install dependencies

   - `npm install`

3. Start local server and run tests
   - `npm run start`
   - `npm run test`
     - The server needs to be running for the e2e tests

Note: for collaboration, ensure you start the websocket server separately with `npm run collab`.

### Optional but recommended, use VSCode for development

1.  Download and install VSCode

    - Download from [here](https://code.visualstudio.com/download) (it’s recommended to use the unmodified version)

2.  Install extensions
    - [Flow Language Support](https://marketplace.visualstudio.com/items?itemName=flowtype.flow-for-vscode)
      - Make sure to follow the setup steps in the README
    - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
      - Set prettier as the default formatter in `editor.defaultFormatter`
      - Optional: set format on save `editor.formatOnSave`
    - [ESlint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)

## Documentation

- [How Lexical was designed](/docs/design.md)
- [Testing](/docs/testing.md)

## Browser Support

- Firefox 52+
- Chrome 49+
- Edge 79+ (when Edge switched to Chromium)
- Safari 11+
- iOS 11+ (Safari)
- iPad OS 13+ (Safari)
- Android Chrome 72+

Note: Lexical does not support Internet Explorer or legacy versions of Edge.

## Contributing

1. Create a new branch
   - `git checkout -b my-new-branch`
2. Commit your changes
   - `git commit -a -m 'Description of the changes'`
     - There are many ways of doing this and this is just a suggestion
3. Push your branch to GitHub
   - `git push origin my-new-branch`
4. Go to the repository page in GitHub and click on "Compare & pull request"
   - The [GitHub CLI](https://cli.github.com/manual/gh_pr_create) allows you to skip the web interface for this step (and much more)

## Support

If you have any questions about Lexical, would like to discuss a bug report, or have questions about new integations, feel free to add yourself to [our Discord sever](https://discord.gg/Pg4n9psf).

Lexical engineers are checking this regularly.

## Running tests

- `npm run test-unit` runs only unit tests.
- `npm run test-e2e:chromium` runs only chromium e2e tests.
- `npm run debug-test-e2e:chromium` runs only chromium e2e tests in head mode for debugging.
- `npm run test-e2e:firefox` runs only firefox e2e tests.
- `npm run debug-test-e2e:firefox` runs only firefox e2e tests in head mode for debugging.
- `npm run test-e2e:webkit` runs only webkit e2e tests.
- `npm run debug-test-e2e:webkit` runs only webkit e2e tests in head mode for debugging.

### License

Lexical is [MIT licensed](./LICENSE).
