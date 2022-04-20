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

If you've used React Hooks before, you can think of `$` functions as being something that follows a similar pattern. These are functions that show their intent as to where and where they cannot be used. This makes it possible for a developer to create their own functions that give the same signal, by simply prefixing the function with the dollar.

Internally, we've found this scales really well and developers get to grips with it in almost no time at all.