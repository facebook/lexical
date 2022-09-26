---
sidebar_position: 7
---

# FAQ

## Why does Lexical use the `$` prefix in the name of many of the functions?

Originally, Lexical didn't have `$` functions, instead these functions were provided to you through callback params:

```js
// Mid 2020 API
editor.update((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
editor.addTextTransform((viewState) => {
  const getRoot = viewState.getRoot();
  ..
});
```

Internally, this approach raised some negative feedback:

- The `viewState` terminology was confusing. It wasn't really a `viewState`, more like a toolkit to manipulate the `EditorState`
- For complex updates and transforms devs had to carry params around on many layers

This is when we decided to leverage the "lexical" scope instead to perform `EditorState` manipulation, and the `$` represents just that.

```js
editor.update(() => ...);
editor.registerNodeTransform(FooNode, () => ...);
editor.getEditorState().read(...);
```

If you've used React Hooks before, you can think of `$` functions as being something that follows a similar pattern. These are functions that show their intent as to where they can or cannot be used. This makes it possible for a developer to create their own functions that give the same signal, by simply prefixing the function with the dollar.

Internally, we've found this scales really well and developers get to grips with it in almost no time at all.

## How do I listen for user text insertions?

Listening to text insertion events is problematic with content editables in general. It's a common source of bugs due to how
different browsers and third-party extensions interact with the DOM. Whilst it's possible to use DOM events like `input` and
`beforeinput` to gauge some of the possible cases where a user has inserted text, these are hardly reliable and also don't
take into account edge-cases. Instead, Lexical prefers to consider any change as a possible user input, and as such doesn't
make a distinction between the cases. This is important for tools like spellcheck, browser extensions, IME, speech-to-text,
screen readers and other external tools that often don't reliably trigger a reliable event sequence (some don't even trigger
any events at all!).

For those wanting to react to a text change and possibly block/alter the intent, the recommended approach is to use a node
transform. This also plays nicely with other sub-systems at play that might also be looking to do the same thing as you.

For those who just want to know of the changes, this can be achieved using a text content listener or an editor update listener.

## How do I clear the contents of the editor?

You can go this by calling ```clear()``` on the RootNode in an update callback:

```js
editor.update(() => {
  $getRoot().clear();
})
```
