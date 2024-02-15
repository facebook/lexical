<h1 align="center">
  <a href="https://lexical.dev">Lexical</a>
</h1>

<p align="center">
  <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/facebook/lexical/test.yml"/>
  <a href="https://www.npmjs.com/package/lexical">
    <img alt="Visit the NPM page" src="https://img.shields.io/npm/v/lexical"/>
  </a>
  <a href="https://discord.gg/KmG4wQnnD9">
    <img alt="Add yourself to our Discord" src="https://img.shields.io/discord/953974421008293909"/>
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=lexicaljs">
    <img alt="Follow us on Twitter" src="https://img.shields.io/twitter/follow/lexicaljs?style=social"/>
  </a>
</p>

Lexical is an extensible JavaScript web text-editor framework with an emphasis on reliability, accessibility, and performance. Lexical aims to provide a best-in-class developer experience, so you can easily prototype and build features with confidence. Combined with a highly extensible architecture, Lexical allows developers to create unique text editing experiences that scale in size and functionality.

For documentation and more information about Lexical, be sure to [visit the Lexical website](https://lexical.dev).

Here are some examples of what you can do with Lexical:

- [Lexical Playground](https://playground.lexical.dev)
- [Plain text sandbox](https://codesandbox.io/s/lexical-plain-text-example-g932e)
- [Rich text sandbox](https://codesandbox.io/s/lexical-rich-text-example-5tncvy)


---

**Overview:**

- [Getting started with React](#getting-started-with-react)

- [Lexical is a framework](#lexical-is-a-framework)

- [Working with Lexical](#working-with-lexical)

- [Contributing to Lexical](#contributing-to-lexical)

---

## Getting started with React

> Note: Lexical is not only limited to React. Lexical can support any underlying DOM based library once bindings for that library have been created.

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
  // ...
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
      <OnChangePlugin onChange={onChange} />
      <HistoryPlugin />
      <MyCustomAutoFocusPlugin />
    </LexicalComposer>
  );
}
```

## Lexical is a framework

The core of Lexical is a dependency-free text editor framework that allows developers to build powerful, simple and complex,
editor surfaces. Lexical has a few concepts that are worth exploring:

### Editor instances

Editor instances are the core thing that wires everything together. You can attach a contenteditable DOM element to editor instances, and also
register listeners and commands. Most importantly, the editor allows for updates to its `EditorState`. You can create an editor instance
using the `createEditor()` API, however you normally don't have to worry when using framework bindings such as `@lexical/react` as this
is handled for you.

### Editor States

An Editor State is the underlying data model that represents what you want to show on the DOM. Editor States contain two parts:

- a Lexical node tree
- a Lexical selection object

Editor States are immutable once created, and in order to create one, you must do so via `editor.update(() => {...})`. However, you
can also "hook" into an existing update using node transforms or command handlers – which are invoked as part of an existing update
workflow to prevent cascading/waterfalling of updates. You can retrieve the current editor state using `editor.getEditorState()`.

Editor States are also fully serializable to JSON and can easily be serialized back into the editor using `editor.parseEditorState()`.

### Editor Updates

When you want to change something in an Editor State, you must do it via an update, `editor.update(() => {...})`. The closure passed
to the update call is important. It's a place where you have full "lexical" context of the active editor state, and it exposes
access to the underlying Editor State's node tree. We promote using `$` prefixed functions in this context, as it signifies a place
where they can be used exclusively. Attempting to use them outside of an update will trigger a runtime error with an appropriate error.
For those familiar with React Hooks, you can think of these as having a similar functionality (except `$` functions can be used in any order).

### DOM Reconciler

Lexical has its own DOM reconciler that takes a set of Editor States (always the "current" and the "pending") and applies a "diff"
on them. It then uses this diff to update only the parts of the DOM that need changing. You can think of this as a kind-of virtual DOM,
except Lexical is able to skip doing much of the diffing work, as it knows what was mutated in a given update. The DOM reconciler
adopts performance optimizations that benefit the typical heuristics of a content editable – and is able to ensure consistency for
LTR and RTL languages automatically.

### Listeners, Node Transforms and Commands

Outside of invoking updates, the bulk of work done with Lexical is via listeners, node transforms and commands. These all stem from
the editor and are prefixed with `register`. Another important feature is that all the register methods return a function to easily unsubscribe them. For example here is how you listen to an update to a Lexical editor:

```js
const unregisterListener = editor.registerUpdateListener(({editorState}) => {
  // An update has occurred!
  console.log(editorState);
});

// Ensure we remove the listener later!
unregisterListener();
```

Commands are the communication system used to wire everything together in Lexical. Custom commands can be created using `createCommand()` and
dispatched to an editor using `editor.dispatchCommand(command, payload)`. Lexical dispatches commands internally when key presses are triggered
and when other important signals occur. Commands can also be handled using `editor.registerCommand(handler, priority)`, and incoming commands are
propagated through all handlers by priority until a handler stops the propagation (in a similar way to event propagation in the browser).

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
  namespace: 'MyEditor',
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

### Working with Editor States

With Lexical, the source of truth is not the DOM, but rather an underlying state model
that Lexical maintains and associates with an editor instance. You can get the latest
editor state from an editor by calling `editor.getEditorState()`.

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
- Using a command listener with `editor.registerCommand(EXAMPLE_COMMAND, () => {...}, priority)`

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

## Contributing to Lexical

1. Clone this repository

2. Install dependencies

   - `npm install`

3. Start local server and run tests
   - `npm run start`
   - `npm run test-e2e-chromium` to run only chromium e2e tests
     - The server needs to be running for the e2e tests

`npm run start` will start both the dev server and collab server. If you don't need collab, use `npm run dev` to start just the dev server.

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

- [Getting started](https://lexical.dev/docs/intro)
- [Concepts](https://lexical.dev/docs/concepts/editor-state)
- [How Lexical was designed](https://lexical.dev/docs/design)
- [Testing](https://lexical.dev/docs/testing)

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

If you have any questions about Lexical, would like to discuss a bug report, or have questions about new integrations, feel free to join us at [our Discord server](https://discord.gg/KmG4wQnnD9).

Lexical engineers are checking this regularly.

## Running tests

- `npm run test-unit` runs only unit tests.
- `npm run test-e2e-chromium` runs only chromium e2e tests.
- `npm run debug-test-e2e-chromium` runs only chromium e2e tests in head mode for debugging.
- `npm run test-e2e-firefox` runs only firefox e2e tests.
- `npm run debug-test-e2e-firefox` runs only firefox e2e tests in head mode for debugging.
- `npm run test-e2e-webkit` runs only webkit e2e tests.
- `npm run debug-test-e2e-webkit` runs only webkit e2e tests in head mode for debugging.

# Local Development Setup

Our monorepo utilizes Verdaccio, a lightweight private npm registry, to streamline local development and testing of our packages. Follow the steps below to set up your local development environment, increment package versions, prepare releases, and publish them to our Verdaccio server.

## Prerequisites

- **Node.js and npm**: Make sure you have Node.js and npm installed on your machine. You can download them from [nodejs.org](https://nodejs.org/).
- **Verdaccio**: If you haven't already, install Verdaccio globally on your machine. You can install it via npm:

  ```bash
  npm install -g verdaccio
  ```

- **Running Verdaccio**: Before publishing packages, ensure Verdaccio is running locally:

  ```bash
  verdaccio
  ```

  This command starts the Verdaccio server on `http://localhost:4873` by default. Keep it running in a separate terminal window or background process.

## Setup Steps

1. **Clone the Repository**: If you haven't already, clone the monorepo to your local machine:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**: Install the project dependencies by running:

   ```bash
   npm install
   ```

3. **Increment Package Version**: Increment the version of the package(s) you are working on. This step ensures your local changes are versioned correctly. You can increment the version as a patch, minor, or major update:

   ```bash
   npm run increment-version -- --i patch
   ```

   Replace `patch` with `minor` or `major` as needed.

4. **Prepare for Release**: Run the build or any other preparatory tasks required before publishing:

   ```bash
   npm run prepare-release
   ```

5. **Publish to Verdaccio**: Publish your package(s) to the local Verdaccio server. This step simulates publishing to the npm registry without affecting the global package registry:

   ```bash
   node ./scripts/npm/release-local.js --non-interactive --channel dev
   ```

   The `--non-interactive` flag automates the process, bypassing any prompts that may require manual input. The `--channel dev` specifies that this release is for development purposes.

## Next Steps

After publishing to Verdaccio, you can install and test these packages in your local projects as if they were published to the npm registry. This approach allows you to validate your changes in a controlled environment before proceeding with a production release.


### License

Lexical is [MIT licensed](https://github.com/facebook/lexical/blob/main/LICENSE).
