---
sidebar_position: 4
---

# Node Transforms

Transforms are the most efficient mechanism to respond to changes to the EditorState.

For example:
User types a character and you want to color the word blue if the word is now equal to "congrats".
We programmatically add an `@Mention` to the editor, the `@Mention` is immediately next to another `@Mention` (`@Mention@Mention`). Since we believe this makes mentions hard to read, we want to destroy/replace both mentions and render them as plain TextNode's instead.

```js
const removeTransform = editor.registerNodeTransform(TextNode, (textNode) => {
  if (textNode.getTextContent() === 'blue') {
    textNode.setTextContent('green');
  }
});
```

## Syntax

```typescript
editor.registerNodeTransform<T: LexicalNode>(Class<T>, T): () => void
```

## Lifecycle

Transforms are executed sequentially before changes are propagated to the DOM and multiple transforms still lead to a single DOM reconciliation (the most expensive operation in Lexical's lifecycle).

![Transforms lifecycle](/img/docs/transforms-lifecycle.svg)

**Beware!**

In most cases, it is possible to achieve the same or very similar result through an [update listener](/docs/concepts/listeners#registerupdatelistener) followed by an update. This is highly discouraged as it triggers an additional render (the most expensive lifecycle operation).

Additionally, each cycle creates a brand new EditorState object which can interfere with plugins like HistoryPlugin (undo-redo) if not handled correctly.

```js
editor.addUpdateListener(() => {
  editor.update(() => {
    // Don't do this
  });
});
```

## Preconditions

Preconditions are fundamental for transforms to prevent them from running multiple times and ultimately causing an infinite loop.

Transforms are designed to run when nodes have been modified (aka marking nodes dirty). For the most part, transforms only need to run once after the update but the sequential nature of transforms makes it possible to have order bias. Hence, transforms are run over and over until this particular type of Node is no longer marked as dirty by any of the transforms.

Hence, we have to make sure that the transforms do not mark the node dirty unnecessarily.

```js
// When a TextNode changes (marked as dirty) make it bold
editor.registerNodeTransform(TextNode, textNode => {
  // Important: Check current format state
  if (!textNode.hasFormat('bold')) {
    textNode.toggleFormat('bold');
  }
}
```

But oftentimes, the order is not important. The below would always end up in the result of the two transforms:

```js
// Plugin 1
editor.registerNodeTransform(TextNode, textNode => {
  // This transform runs twice but does nothing the first time because it doesn't meet the preconditions
  if (textNode.getTextContent() === 'modified') {
    textNode.setTextContent('re-modified');
  }
}
// Plugin 2
editor.registerNodeTransform(TextNode, textNode => {
  // This transform runs only once
  if (textNode.getTextContent() === 'original') {
    textNode.setTextContent('modified');
  }
}
// App
editor.addListener('update', ({editorState}) => {
  const text = editorState.read($textContent);
  // text === 're-modified'
});
```

## Transforms on parent nodes

Transforms are very specific to a type of node. This applies to both the declaration (`registerNodeTransform(ImageNode)`) and the times it triggers during an update cycle.

```js
// Won't trigger
editor.registerNodeTransform(ParagraphNode, ..)
// Will trigger as TextNode was marked dirty
editor.registerNodeTransform(TextNode, ..)
editor.update(() => {
  const textNode = $getNodeByKey('3');
  textNode.setTextContent('foo');
});
```

While the marked dirty rule is always true, there are some cases when it's not immediately obvious and/or we force nearby nodes to become dirty for the sake of easier transform logic:
You add a node to an ElementNode, the ElementNode and the newly added children are marked dirty, also its new immediate siblings
You remove a node, its parent is marked dirty, also the node's immediate siblings prior to being removed
You move a node via `replace`, rules 2 and 1 are applied.

```js
editor.registerNodeTransform(ParagraphNode, paragraph => {
 // Triggers
});
editor.update(() => {
  const paragraph = $getRoot().getFirstChild();
  paragraph.append($createTextNode('foo');
});
```

## registerLexicalTextEntity

It is common to have certain nodes that are created/destroyed based on their text content and siblings. For example, `#lexical` is a valid hashtag whereas `#!lexical` is not.

This is a perfectly valid case for transforms but we have gone ahead and already built a utility transform wrapper for you for this specific case:

```typescript
registerLexicalTextEntity<N: TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): Array<() => void>;
```

## Examples

1. [Emoticons (guided example)](https://github.com/facebook/lexical/blob/main/examples/emoticons.md)
2. [Emojis](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/EmojisPlugin/index.ts)
3. [AutoLink](https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/AutoLinkPlugin/index.tsx)
4. [HashtagPlugin](https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalHashtagPlugin.ts)
