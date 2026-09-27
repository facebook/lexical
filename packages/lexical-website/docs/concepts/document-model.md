# Document Model

An [editor state](./editor-state.md) holds a tree of nodes. This page explains
how that tree is shaped and how it compares with other editors.

## A DOM-like tree

Lexical's node tree is shaped like the HTML it renders. A paragraph is an
`ElementNode` whose children are the nodes inside it, and inline structure
nests the same way: a link is a `LinkNode` element that contains the text
nodes it wraps, just as an `<a>` contains its text. Each node type decides how
it renders with `createDOM()` and `updateDOM()`, so the model maps closely to
the DOM, and a position in the document is a node plus an offset within it.

## Compared with ProseMirror

This is a deliberate difference from editors such as
[ProseMirror](https://prosemirror.net). ProseMirror's document is also a tree,
and blocks can contain other blocks, but the inline content of a textblock is
a flat sequence of nodes (text and inline nodes) with marks for formatting and
links, and every position in the document is a single integer.

| | Lexical | ProseMirror |
| -- | -- | -- |
| Document | Immutable tree of nodes, one `RootNode` | Immutable tree of nodes, one `doc` node |
| Node identity and navigation | Each node has a runtime key and knows its parent and siblings | Nodes are plain values with no parent links; a resolved position supplies ancestor context |
| Blocks | `ElementNode` subclasses (paragraph, heading, list, table, …), or a block `DecoratorNode` (image, embed, …) | Block nodes defined in the schema |
| Inline formatting | Format flags on each `TextNode` (bold, italic, code, …) | Marks on text |
| Links and other inline wrappers | Inline `ElementNode`s (`LinkNode`, `MarkNode`) that contain text nodes | Marks on text, like formatting |
| Embedded content | `DecoratorNode`, inline or block, rendered by your framework (for example React) | Leaf or atom nodes, often with a custom `NodeView` |
| Several editable regions in one node | [Named slots](./named-slots.md): regions addressed by name, like a card's `title`, each isolated so editing and selection never cross the boundary | Child nodes in the order the schema's content expression allows, optionally marked `isolating`, or a separate editor inside a `NodeView` |
| Addressing a position | Node key plus offset (`{key, offset, type}`) | One integer counted across the whole document |
| Allowed structure | Declared by node classes, enforced with node transforms and normalization | Declared by a schema of content expressions |
| Applying edits | Call node and selection methods inside `editor.update()` | Build a transaction from steps that address positions or ranges |
| Rendering | Each node's `createDOM()`/`updateDOM()`, applied by the reconciler, and optionally changed per node class by a `DOMRenderExtension` override | `toDOM` in the schema, or a `NodeView` |

In practice, this means Lexical code navigates the document the way DOM code
does, with methods like `getParent()`, `getChildren()`, and `getNextSibling()`,
and each node owns the DOM it renders. The resemblance is structural, not one
node per HTML element: bold or italic text, for example, is a format on a
`TextNode`, not a separate `<strong>` or `<em>` node. See
[Nodes](./nodes.mdx) for the built-in node types.

## Customizing rendering

You can also change how nodes render without subclassing them.
[`DOMRenderExtension`](../serialization/dom-render.md) from `@lexical/html`
takes overrides for `createDOM`, `updateDOM`, and `exportDOM`, for one node
class or for every node, such as adding a `data-` attribute or wrapping a
node's children in another element. Each override calls `$next()` to get the
default result and adjusts it, so overrides from several extensions compose,
and the same overrides apply both to the editor's DOM and to HTML export.

For how the tree is converted to and from JSON, HTML, and Markdown, and how
that compares with ProseMirror, see
[Serialization](../serialization/serialization.md#formats-at-a-glance).
