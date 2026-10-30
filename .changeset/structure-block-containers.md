---
'lexical': patch
'@lexical/list': patch
'@lexical/markdown': patch
'@lexical/mdast': patch
'@lexical/selection': patch
'@lexical/utils': patch
---

[feature] With `NodeStructureExtension`, a node class that declares `children: 'block'` is a block container: structural commands convert, wrap, split and insert blocks inside it instead of replacing or splitting it, and `$isBlockContainer` tells whether a node is one

The commands that stopped only at the root or a shadow root now also stop at such a node: `$insertList`, Enter in an empty list item, `$wrapNodes`, `RangeSelection.insertNodes` and `insertParagraph`, `$insertNodeToNearestRoot` and `$insertNodeToNearestRootAtCaret`, and the `@lexical/markdown` and `@lexical/mdast` block shortcuts. It is not a selection boundary: select-all, the arrow keys, and Backspace or Delete at its edges behave as before. Classes that declare nothing, and editors without the extension, keep the current behavior, except that with the extension `$insertList` no longer drops the selected text's list when that text sits in a block a list item cannot hold (a box inside a box, a quote inside a box): it converts that block in place.

Verify: declare `children: 'block'` on a callout-like container, run `NodeStructureExtension`, and check that turning one of its paragraphs into a list, a heading via a markdown shortcut, or pasting several paragraphs into one keeps the container and its other blocks.
