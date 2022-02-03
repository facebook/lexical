# `lexical`

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

## Usage

The `lexical` package contains only the core Lexical engine and nodes. This package is intended to be used in conjunction with packages that wire Lexical up to applications, such as `@lexical/react`.

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