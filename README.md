# Lexical

Lexical is an extensible JavaScript text-editor that provides reliable, accessible and performant typing experiences for the web.

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
  throw error;
}

function Editor() {
  return (
    <LexicalComposer theme={theme}>
      <LexicalPlainTextPlugin
        contentEditable={<LexicalContentEditable />}
        placeholder={<div>Enter some text...</div>}
        onError={onError}
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

### Creating an editor instance and using it

When you work with Lexical, you normally work with a single editor instance. An editor instance can be created from the `lexical` package and accepts
an optional configuration object that allows for theming and the passing of context:

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
just pass an alternative element reference to `setRootElement`.

### Understanding Editor State

TODO

### Updating an editor instance

There are two ways to update an editor instance, either with `editor.update()` or `editor.setEditorState()`.

TODO

## Contributing to Lexical

1. Clone this repository

2. Install dependencies
   - `npm install`

3. Start local server and run tests
   - `npm run start`
   - `npm run test`
     - The server needs to be running for the e2e tests

### Optional but recommended, use VSCode for development

1.  Download and install VSCode
    - Download from [here](https://code.visualstudio.com/download) (it’s recommended to use the unmodified version)

2. Install extensions
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

## Running tests

- `npm run test-unit` runs only unit tests.
- `npm run test-e2e:chromium` runs only chromium e2e tests.
- `npm run debug-test-e2e:chromium` runs only chromium e2e tests in head mode for debugging.
- `npm run test-e2e:firefox` runs only firefox e2e tests.
- `npm run debug-test-e2e:firefox` runs only firefox e2e tests in head mode for debugging.
- `npm run test-e2e:webkit` runs only webkit e2e tests.
- `npm run debug-test-e2e:webkit` runs only webkit e2e tests in head mode for debugging.
