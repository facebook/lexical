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

:::tip

The methods of a caret are designed to operate on nodes attached to the `origin`
in the designated direction, not the `origin` itself. For example, this code is
a no-op because it will attach a node to the `origin`, and then remove the node
that was just attached.

```ts
// The origin is unaffected (other than being marked dirty)
caret.insert($createTextNode('no-op')).remove();
```

:::

:::warning

Carets are immutable, and designed for low-level usage. There is no attempt
for carets to automatically update based on changes to the document
(this is a common source of bugs when working with `RangeSelection`).
Functions and methods that work with carets and are expected to change the
structure of the document will always return a possibly new caret.

The `origin` of a caret is the exact version of the object that it was
constructed with, all accessor methods on that origin will generally call
`origin.getLatest()` so the operations will see the latest version.

:::

### NodeCaret

`NodeCaret` is any `BreadthCaret` or any `DepthCaret`
* Typically constructed with `$getChildCaretOrSelf($getBreadthCaret(origin, direction))`
  which returns a `DepthCaret` when the origin is an `ElementNode`

### BreadthCaret

`BreadthCaret` is a caret that points towards a sibling of the origin

* Constructed with `$getBreadthCaret(origin: LexicalNode, direction: CaretDirection)`
* The `next` direction points towards the right
* The `previous` direction points towards the left

|                        | → direction: `'next'`      | ← direction: `'previous'`     |
|------------------------|---------------------------|-------------------------------|
| `getParentAtCaret()`   | `origin.getParent()`      | `origin.getParent()`          |
| `getNodeAtCaret()`     | `origin.getNextSibling()` | `origin.getPreviousSibling()` |
| `insert(node)`         | `origin.insertAfter(node)`| `origin.insertBefore(node)`   |

### DepthCaret

`DepthCaret` is a caret that points towards the first or last child of the origin

* Constructed with `$getDepthCaret(origin: ElementNode, direction: CaretDirection)`
* The `next` direction points towards the first child
* The `previous` direction points towards the last child

|                        | ↘ direction: `'next'`      | ↙ direction: `'previous'`     |
|------------------------|----------------------------|-------------------------------|
| `getParentAtCaret()`   | `origin`                   | `origin`                      |
| `getNodeAtCaret()`     | `origin.getFirstChild()`   | `origin.getLastChild()`       |
| `insert(node)`         | `origin.splice(0, 0, node)`| `origin.append(node)`         |

### PointCaret

`PointCaret` is any `TextPointCaret`, `BreadthCaret` or `DepthCaret`. This
type can be used to represent any point in the document that `PointType` can represent.

:::tip

Because `TextPointCaret` is a subclass of `BreadthCaret`, this type is
really just used to document that the function will not ignore
`TextPointCaret`

:::

### TextPointCaret

`TextPointCaret` is a specialized `BreadthCaret` with any `TextNode` origin and an `offset` property
* Constructed with `$getTextPointCaret(origin, direction, offset)`
* The `offset` property is an absolute index into the string
* The `next` direction implies all text content after `offset`
* The `previous` direction implies all text content before `offset`


:::warning

Since `TextPointCaret` is a specialization of `BreadthCaret`, the offset will be ignored
by functions that are not also specialized to handle it.

:::

### TextPointCaretSlice

`TextPointCaretSlice` is a wrapper for `TextPointCaret` that provides a signed `distance`,
it is just a data structure and has no methods.

* Constructed with `$getTextPointCaretSlice(caret, distance)`
* `Math.min(caret.offset, caret.offset + distance)` refers to the start offset of the slice
* `Math.max(caret.offset, caret.offset + distance)` refers to the end offset of the slice
* The `direction` of the caret is generally ignored when working with a
  `TextPointCaretSlice`, the slice is in absolute string coordinates

### CaretRange

`CaretRange` contains a pair of `PointCaret` that are in the same direction. It
is equivalent in purpose to a `RangeSelection`.

* Constructed with `$getCaretRange(anchor, focus)` or `$caretRangeFromSelection(selection)`
* The `anchor` is the start of the range, generally where the selection originated,
  and it is "anchored" in place because when a selection grows or shrinks only the
  `focus` will be moved
* The `focus` is the end of the range, where the blinking cursor is, it's the current
  focus of the user
* Anchor and focus must point in the same direction. The `anchor` points towards the first
  node *in the range* and the focus points towards the first node *not in the range*

## Traversal Strategies

### Adjacent Caret Traversals

The lowest level building block for traversals with NodeCaret is the adjacent caret
traversal, which is supported directly by methods of NodeCaret.

`getAdjacentCaret()` - Gets a `BreadthCaret` for the node attached to
  `origin` in direction. If there is no attached node, it will return `null`

`getParentCaret(rootMode)` - Gets a `BreadthCaret` for the parent node
  of `origin` in the same direction. If there is no parent node, or the parent
  is a root according to `rootMode`, then it will return `null`. `rootMode`
  may be `'root'` to only return `null` for `RootNode` or `'shadowRoot'` to
  return `null` for `RootNode` or any `ElementNode` parent where
  `isShadowRoot()` returns true

`getChildCaret()` - Gets a `DepthCaret` for this origin, or `null` if the
  origin is not an `ElementNode`. Will return `this` if the caret is already
  a `DepthCaret`

For example, iterating all siblings:

```ts
// Note that NodeCaret<D> already implements Iterable<NodeCaret<D>> in this
// way, so this function is not very useful. You can just use startCaret as
// the iterable.
function *iterSiblings<D extends CaretDirection>(
  startCaret: NodeCaret<D>
): Iterable<NodeCaret<D>> {
  for (
    let caret = startCaret.getAdjacentCaret();
    caret !== null;
    caret = caret.getAdjacentCaret()
  ) {
    yield caret;
  }
}
```

### Depth First Caret Traversals

The strategy to do a depth-first caret traversal is to use an adjacent caret
traversal and immediately use a `DepthCaret` any time that an `ElementNode`
origin is encountered. This strategy yields all possible carets, but each
ElementNode in the traversal may be yielded once or twice (a `DepthNode` on
enter, and a `BreadthNode` on leave). Allowing you to see whether an
`ElementNode` is partially included in the range or not is one of the
reasons that this abstraction exists.


```ts
function *iterAllNodes<D extends CaretDirection>(
  startCaret: NodeCaret<D>,
  endCaret = startCaret.getParentCaret('root')
): Iterable<NodeCaret<D>> {
  for (
    let caret = startCaret.getAdjacentCaret();
    caret !== null;
    caret = caret.getAdjacentCaret()
  ) {

  }
}

// This is in getNodes() style where it's very hard to tell if the ElementNode
// partially or completely included
```

`$getAdjacentDepthCaret(caret)` - `$getChildCaretOrSelf(caret?.getAdjacentCaret())`

`$getAdjacentSiblingOrParentSiblingCaret(caret)` - 

## Future Direction

It's expected that higher-level abstractions will be built on top of this
outside of the core, either in @lexical/utils or a separate companion package.
This is just designed to be the lowest-level layer with a consistent and
type-safe interface. That sort of abstraction will probably look a little bit
like cheerio or jQuery, but for working with Lexical documents. It is not
expected that more abstractions will be added to the core.

In order to reduce code size and eliminate bugs, more of the core will be
refactored to use NodeCaret internally.

Once this happens, it's possible that the internal structure of PointType
and/or RangeSelection may change to accommodate NodeCaret, as it is more
resilient to document changes (only changes that directly affect the
orgin node will "break" the point). A simple version of this would be to
create a caret any time that the point changes, and use that caret
as a fallback if the selection would otherwise be lost.

It may be the case that NodeCaret will become the lowest level API, working
directly with private LexicalNode/ElementNode internals. When/if that happens,
the methods on LexicalNode will remain for backwards compatibility,
but overriding them will not be supported. It isn't particularly safe to
override them as-is anyway, and these overrides are frequently the
root cause of bugs (e.g. parents that remove themselves after an operation
on a child, causing the point to be lost unless the caller was sophisticated
enough to store the array of parents).

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
