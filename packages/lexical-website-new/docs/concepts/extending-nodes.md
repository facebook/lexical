---
sidebar_position: 3
---

# Extending Nodes

## Base Nodes

Nodes are core concept in Lexical. Not only do they form the visual editor view, as part of the `EditorState`, but they also represent the
underlying data model for what is stored in the edtior at any given time. Lexical has a single core based node, called `LexicalNode` that
is extended internally to create Lexical's five base nodes:

- `RootNode`
- `LineBreakNode`
- `ElementNode`
- `TextNode`
- `DecoratorNode`

Of these nodes, three of them are exposed from the `lexical` package, making them ideal to be extended:

- `ElementNode`
- `TextNode`
- `DecoratorNode`

### `RootNode`

There is only ever a single `RootNode` in an `EditorState` and it is always at the top and it represents the
`contenteditable` itself. This means that the `RootNode` does not have a parent or siblings and also.

- To get the text content of the entire editor, you should use `rootNode.getTextContent()`.
- To avoid selection issues, Lexical forbids insertion of text nodes directly into a `RootNode`.

### `LineBreakNode`

You should never have `'\n'` in your text nodes, instead you should use the `LineBreakNode` which represents
`'\n'`, and more importantly, can work consistently between browsers and operating systems.

### `ElementNode`

> TODO

### `TextNode`

> TODO

### `DecoratorNode`

> TODO

## Node Properties

Lexical nodes can have properties. It's important that these properties are JSON serializable too, so you should never
be assigning a property to a node that is a function, Symbol, Map, Set, or any other object that has a different prototype
than the built-ins. `null`, `undefined`, `number`, `string`, `boolean`, `{}` and `[]` are all types of property that be
assigned to node.

By convention, we prefix properties with `__` (double underscore) so that it makes it clear that these properties are private
and their access should be avoided directly. We opted for `__` instead of `_` because of the fact that some build tooling
mangles and minifies single `_` prefixed properties to improve code size. However, this breaks down if you're exposing a node
to be extended outside of your build~

If you are adding a property that you expect to be modifiable or accessable, then you should always create a set of `get*()`
and `set*()` methods on your node for this property. Inside these methods, you'll need to invoke some very important methods
that ensure consistency with Lexical's internal immutable system. These methods are `getWritable()` and `getLatest()`.

```js
import type {NodeKey} from 'lexical';

class MyCustomNode extends SomeOtherNode {
  __foo: string;

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() creates a clone of the node
    // if needed, to ensure we don't try and mutate
    // a stale version of this node.
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() ensures we are getting the most
    // up-to-date value from the EditorState.
    const self = this.getLatest();
    return self.__foo;
  }
}
```

Lastly, all nodes should have both a `static getType()` method and a `static clone()` method.
Lexical uses the type to be able to reconstruct a node back with its associated class prototype
during deserialization (important for copy + paste!). Lexical uses cloning to ensure consistency
between creation of new `EditorState` snapshots.

Expanding on the exmaple above with these methods:

```js
class MyCustomNode extends SomeOtherNode {
  __foo: string;

  static getType(): string {
    return 'custom-node';
  }

  static clone(node: MyCustomNode): MyCustomNode {
    return new MyCustomNode(node.__foo, node.__key);
  }

  constructor(foo: string, key?: NodeKey) {
    super(key);
    this.__foo = foo;
  }

  setFoo(foo: string) {
    // getWritable() creates a clone of the node
    // if needed, to ensure we don't try and mutate
    // a stale version of this node.
    const self = this.getWritable();
    self.__foo = foo;
  }

  getFoo(): string {
    // getLatest() ensures we are getting the most
    // up-to-date value from the EditorState.
    const self = this.getLatest();
    return self.__foo;
  }
}
```

## Creating custom nodes

As mentioned above, Lexical exposes three base nodes that can be extended.

> Did you know? Nodes such as `ElementNode` are already extended in the core
by Lexical, such as `PargraphNode` and`RootNode`!

### Extending `ElementNode`

Below is an example of how you might extend `ElementNode`:

```js
import {ElementNode} from 'lexical';

export class CustomParagraph extends ElementNode {
  static getType(): string {
    return 'custom-paragraph';
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new CustomParagraph(node.__key);
  }

  createDOM(): HTMLElement {
    // Define the DOM element here
    const dom = document.createElement('p');
    return dom;
  }

  updateDOM(prevNode: CustomParagraph, dom: HTMLElement): boolean {
    // Returning false tells Lexical that this node does not need its
    // DOM element replacing with a new copy from createDOM.
    return false;
  }
}
```

It's also good etiquette to provide some `$` prefixed utility functions for
your custom `ElementNode` so that others can easily consume and validate nodes
are that of your custom node. Here's how you might do this for the above example:

```js
export function $createCustomParagraphNode(): ParagraphNode {
  return new CustomParagraph();
}

export function $isCustomParagraphNode(node: ?LexicalNode): boolean {
  return node instanceof CustomParagraph;
}
```

### Extending `TextNode`

> TODO

### Extending `DecoratorNode`

> TODO