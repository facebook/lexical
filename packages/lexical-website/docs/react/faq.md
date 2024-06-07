---
---

# React FAQ

## My app does not work in dev when using StrictMode, help!?

When hooks are used correctly, there are no known issues with React StrictMode
and Lexical. The first thing you should do is go through React's documentation
to make sure that your usage of `useEffect` and other hooks follow React's
conventions and guidelines. This is a great place to start:
[My Effect runs twice when the component mounts](https://react.dev/reference/react/useEffect#my-effect-runs-twice-when-the-component-mounts)

Some Lexical-specific concerns (which are consequences of React's
concurrent and StrictMode semantics, not due to anything unusual in Lexical):

* In React 19, `useMemo` calls are cached across StrictMode re-renders, so
  only one editor will be used for both renders. If you have a `useEffect`
  call with side-effects (such as updating the document when a plug-in
  initializes), then you should first check to make sure that this effect
  has not already occurred (e.g. by checking the state of the document or
  undoing the change as a cleanup function returned by the effect)
* `LexicalComposer`'s initialConfig prop is only considered once during
  the first render (`useMemo` is used to create the `LexicalComposerContext`
  which includes the editor and theme)
* If you are using an `editorState` argument in the config when creating the
  editor, it will only be called once when the editor is created.
* You should generally prefer to use hooks that return state such as
  `useLexicalEditable` (`useLexicalSubscription` is a generalization of this
  style) rather than manually registering the listeners and expecting a
  particular sequence of triggers to be called, especially
  when their source is an effect. Listeners are only called when state
  changes, and in StrictMode the state may have changed during the initial
  render. The listeners registered from your second render will not be called
  if the change was triggered by the first render, and you will likely not
  see the listeners triggered during the first render because those effects
  were immediately cleaned up before the change effect occurred.

## LexicalComposerContext.useLexicalComposerContext: cannot find a LexicalComposerContext

This error happens for one reason: the `useLexicalComposerContext()` hook
was called from a component that is not a child of a `LexicalComposer`,
`LexicalNestedComposer`, or `LexicalComposerContext.Provider` from the same
build of Lexical that the hook was imported from.

The most common root causes of this issue are:

* You are trying to use `useLexicalComposerContext()` in a component that is
  not a child of the `LexicalComposer`. If you need to do that, you need to
  pass the context or editor up the tree with something like `EditorRefPlugin`.
* You have multiple builds of Lexical in your project. This could be because
  you have a dependency that has a direct dependency on some other version
  of Lexical (these packages should have Lexical as `peerDependencies`, but
  not all do), or because your project mixes import and require statements
  to import Lexical (including both the esm and cjs builds of the same
  version of Lexical). Resolving this generally requires overriding what
  your package manager does in `package.json`, and/or what the bundler does in
  some configuration file for your framework or bundler. There are a lot of
  combinations of tools in the ecosystem (npm, pnpm, yarn, webpack, vite,
  next.js, etc.), so the syntax of that workaround is quite dependent on
  precisely which tools (and even versions of those tools) that your project
  is using.

## Other complications when using dev mode with fast refresh (aka hot module replacement)

Depending on precisely how the fast refresh implementation you're
using works, you may need to mark the files that create your editor or the
implementation of your LexicalNode subclasses as needing a full refresh.
When things seem broken in dev mode after changing a file, try refreshing the
page first. If that fixes the problem, then mark the file you're working on as
needing a full refresh. For example
[Next.js fast refresh](https://nextjs.org/docs/architecture/fast-refresh#tips)
has a `// @refresh reset` comment that can be used.
