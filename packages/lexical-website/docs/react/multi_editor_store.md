---
sidebar_position: 3
---

# Opening a multi-editor store

The `LexicalMultiEditorStore` makes editor instances portable across your app. 

It does this by working with the `LexicalComposer`. On mount, each composer (a) sets up an editor instance and (b) adds it to the multi-editor store when one is found. The `HistoryPlugin` follows the same process for `historyState`. 

Takeaway: The store's a repo. It doesn't "control" Lexical. 

## Set up

1. Make the multi-editor store parent to one or more `LexicalComposers`. 
2. Add a `multiEditorStoreKey` to each composer's `initialConfig` prop. 

```
<LexicalMultiEditorStore>
  <LexicalComposer initialConfig{{
    ...
    multiEditorStoreKey: 'myFirstKey'
  }}>
    <MyLexicalPlugin>
  </LexicalComposer>
</LexicalMultiEditorStore>
```
3. Enjoy your freedom.

## API

The `useMultiEditorStore` hook offers several "public" functions:

  - `getEditor`
  - `getEditorHistory`
  - `getEditorStoreRecord`
    - Returns a full `EditorRecord` — `editor`, `historStack`, `historyKeys`, and `nestedEditorList`.
  - `getEditorKeychain`
    - Returns a list of your `editorStore`'s current keys. One use is to look up a group of related editors `onClick` in order to serialize and save them.
  - `isNestedEditor`
    - Returns `true` if an editor's key shows it to be the child of a top-level editor. 
  - `deleteEditor`
    - A good way to close an editor with "finality," meaning you won't remount it or recreate it later. 
  - `resetEditorStore`
    - It is what you think — use with care!

## Gotcha!

Portable editors can be great!!

But, they can make it easy to stumble into React "noops," too. 

Imagine you have a Lexical editor inside a tab. You update its state whenever a certain event listener fires on the editor. Now, say you pass that same editor to another tab, causing the old tab to unmount. Oh! React will now kick an ugly red noop error.

Some of these problems may be hidden when editors can't more freely. 

Fortunately, you can manage them in the usual React way. 

For instance: You could surround the `setState` with a nullable `ref` that you set to `null` in a `useEffect` clean-up function. This could prevent the noop from happening.

Some examples: 

- `TypeAheadMenuPlugin.tsx` 
- `useLexicalNodeSelection.ts`
