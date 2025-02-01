# Node Traversals with NodeCaret

NodeCaret offers a unified and efficient way for traversing the document
tree, making it much easier to correctly implement traversals and avoid
edge cases around empty nodes and collapsed selections.

These new low-level functions were all designed to work together as a
fully featured relatively lightweight API to use in the core to
allow us to gradually address some edge cases and then simplify and shrink
the code. We expect higher-level utilities to be developed and shipped
in @lexical/utils or another module at a later date. The current overhead
should be less than 3kB in a production environment.

## Concepts

The core concept with `NodeCaret` is that you can represent any specific
point in the document by using an `origin` node, a `direction` that
points towards an adjacent node (`next` or `previous`), and a `type`
to specify whether the arrow points towards a sibling (`breadth`) or
towards a child (`depth`).

All of these types have a `D` type parameter that must be a `CaretDirection`, so you
can not accidentally mix up `next` and `previous` carets. Many of them
also have a `T` type parameter that encodes the type of the `origin` node.

`BreadthCaretNode` can use any `LexicalNode` as an origin
* Constructed with `$getBreadthCaret(origin, direction)`
* The `next` direction points towards the right (`origin.getNextSibling()`, `origin.insertAfter(…)`)
* The `previous` direction points towards the left (`origin.getPreviousSibling()`, `origin.insertBefore(…)`)

`DepthCaretNode` can use any `ElementNode` as an origin
* Constructed with `$getDepthCaret(origin, direction)`
* The `next` direction points towards the first child (`origin.getFirstChild()`, `origin.splice(0, 0, …)`)
* The `previous` direction points towards the last child (`origin.getLastChild()`, `origin.append(…)`)

`NodeCaret` is any `BreadthCaretNode` or any `DepthCaretNode`
* Constructed with `$getChildCaretOrSelf($getBreadthCaret(origin, direction))`

`TextPointCaret` is a specialized `BreadthNodeCaret` with any `TextNode` origin and an `offset` property
* Constructed with `$getTextPointCaret(origin, direction, offset)`
* The `offset` property is an absolute index into the string
* The `next` direction implies all text content after `offset`
* The `previous` direction implies all text content before `offset`

`PointNodeCaret` is any `TextPointCaret`, `BreadthNodeCaret` or `DepthNodeCaret`
* Because `TextPointCaret` is a subclass of `BreadthNodeCaret`, this type is
  really just here to document that the function will not ignore
  `TextPointCaret`

`TextPointCaretSlice` is a wrapper for `TextPointCaret` that provides a signed `distance`
* Constructed with `$getTextPointCaretSlice(caret, distance)`
* `Math.min(caret.offset, caret.offset + distance)` refers to the start offset of the slice
* `Math.max(caret.offset, caret.offset + distance)` refers to the end offset of the slice
* The `direction` of the caret is generally ignored when working with a
  `TextPointCaretSlice`, the slice is in absolute string coordinates.

TODO `NodeCaretRange` `$getCaretRange`

## History

Before NodeCaret, Lexical's core API offered a relatively low-level DOM-like
interface for working with nodes and traversing them. It has accumulated
many functions over time for performing various kinds of traversals around
the tree (finding ancestors, children, depth, siblings, etc.), but most of
them are not implemented in a way that makes them easy to combine
efficiently, and many of them have edge cases that are difficult to avoid
and can't really be addressed without breaking compatibility.

Many of these functions also have a lot of edge cases, particularly around
assuming the reference nodes are inclusive. Many are also left-to-right
biased, don't offer an iterative version that can be aborted early or
consumed on the fly, etc.

Refactoring many of these to use something like `PointType` would almost
be sufficient for many of these use cases, but the representation of
that type is inefficient and error-prone as any mutation to the tree
requires that each point be manually recomputed. `PointType` is also
directionless, forcing a specific left-to-right bias into most APIs.
`RangeSelection` can be used in many cases because a direction can
be inferred from any two different points, but that collapses with
a single point. It's also impractical to use `RangeSelection`
concurrently with mutations due to the problems with `PointType`.

NodeCaret was born out of frustration with these APIs and a desire
to unify it all in a coherent way to simplify and reduce errors in
the core.
