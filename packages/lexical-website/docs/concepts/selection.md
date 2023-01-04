

# Selection

## Types of selection

Lexical's selection is part of the `EditorState`. This means that for every update, or change to the editor, the
selection always remains consistent with that of the `EditorState`'s node tree.

In Lexical, there are four types of selection possible:

- `RangeSelection`
- `NodeSelection`
- `GridSelection`
- `null`

### `RangeSelection`

This is the most common type of selection, and is a normalization of the browser's DOM Selection and Range APIs.
`RangeSelection` consists of three main properties:

- `anchor` representing a `RangeSelection` point
- `focus` representing a `RangeSelection` point
- `format` numeric bitwise flag, representing any active text formats

Both the `anchor` and `focus` points refer to an object that represents a specific part of the editor. The main properties of a `RangeSelection` point are:

- `key` representing the `NodeKey` of the selected Lexical node
- `offset` representing the position from within its selected Lexical node. For the `text` type this is the character, and for the `element` type this is the child index from within the `ElementNode`
- `type` representing either `element` or `text`.

### `NodeSelection`

NodeSelection represents a selection of multiple arbitrary nodes. For example, three images selected at the same time.

- `getNodes()` returns an array containing the selected LexicalNodes

### `GridSelection`

GridSelection represents a grid-like selection like tables. It stores the key of the parent node where the selection takes place and the start and end points.
`GridSelection` consists of three main properties:

- `gridKey` representing the parent node key where the selection takes place
- `anchor` representing a `GridSelection` point
- `focus` reprensenting a `GridSelection` point

For example, a table where you select row = 1 col = 1 to row 2 col = 2 could be stored as follows:
- `gridKey = 2` table key
- `anchor = 4` table cell (key may vary)
- `focus = 10` table cell (key may vary)

Note that `anchor` and `focus` points work the same way as `RangeSelection`.

### `null`

This is for when the editor doesn't have any active selection. This is common for when the editor has been blurred or when selection
has moved to another editor on the page. This can also happen when trying to select non-editable components within the editor space.

## Working with selection

> TODO
