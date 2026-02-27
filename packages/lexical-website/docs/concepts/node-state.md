# NodeState

The NodeState API introduced in v0.26.0 allows arbitrary state to be added
ad-hoc to any node in a way that participates with reconciliation, history,
and JSON serialization.

## Use Case

NodeState allows your application to define keys that can be stored on
any node with automatic JSON support, you can even add state to the root
node to store document-level metadata.

:::tip

You can even add node state to the RootNode to store document-level metadata,
which wasn't possible at all before!

:::

With a combination of NodeState and other APIs such as
[Listeners](listeners.md) or
[Transforms](transforms.md) you can
likely shape the editor to meet your needs without having to do much
[Node Customization](node-replacement.md).

Even when you are subclassing nodes, using NodeState instead of additional
properties to store the node's data can be [more efficient](#efficiency)
and will save you from writing a lot of boilerplate in the constructor,
updateFromJSON, and exportJSON.

## Stability

🧪 This API is experimental, and may evolve without a long deprecation
period. See also [Capabilities](#capabilities) for notes on what it
can and can not do out of the box today.

## Usage

### createState

[createState](/docs/api/modules/lexical#createstate)
creates a
[StateConfig](/docs/api/classes/lexical.StateConfig)
which defines the key and configuration for your NodeState value.

The key must be locally unique, two distinct StateConfig must not have the
same string key if they are to be used on the same node.

Typical usage will look something like this:

```ts
const questionState = createState('question', {
  parse: (v) => (typeof v === 'string' ? v : ''),
});
```

The required `parse` function serves two purposes:
- It provides a type-safe and runtime-safe way to parse values that were
  serialized to JSON
- When called with `undefined` (or any invalid value) it should return some
  default value (which may be `undefined` or `null` or any other value you
  choose)

In this case, the question must be a string, and the default is an
empty string.

See the
[createState](/docs/api/modules/lexical#createstate)
API documentation for more details, there are other optional settings
that you may want to define particularly if the value is not a primitive
value such as boolean, string, number, null, or undefined.

:::tip

We recommend building a library of small reusable parse functions for the data
types that you use, or a library that can be used to generate them such as
[zod](https://zod.dev/),
[ArkType](https://arktype.io/),
[Effect](https://effect.website/),
[Valibot](https://valibot.dev/),
etc. especially when working with non-primitive data types.

:::

### $getState

[$getState](/docs/api/modules/lexical#getstate) gets the
NodeState value from the given node, or the default if that key was never
set on the node.

```ts
const question = $getState(pollNode, questionState);
```

See also
[$getStateChange](/docs/api/modules/lexical#getstatechange)
if you need an efficient way to determine if the state has changed on two
versions of the same node (typically used in updateDOM, but may be useful in
an update listener or mutation listener).

### $setState

[$setState](/docs/api/modules/lexical#setstate) sets the
NodeState value on the given node.

```ts
const question = $setState(
  pollNode,
  questionState,
  'Are you planning to use NodeState?',
);
```

:::tip

The last argument is a ValueOrUpdater, just like with React's useState
setters. If you use an updater function and the value does not change,
the node and its NodeState *won't* be marked dirty.

:::

## Serialization

The NodeState for a node, if any values are set to non-default values, is
serialized to a record under a single
[NODE_STATE_KEY](/docs/api/modules/lexical#node_state_key)
which is equal to `'$'`. In the future, it is expected that nodes will be
able to declare required state and lift those values to the top-level of
their serialized nodes
(see [#7260](https://github.com/facebook/lexical/issues/7260)).

```json
{
  "type": "poll",
  "$": {
    "question": "Are you planning to use NodeState?",
  }
}
```

:::tip

By default, it is assumed that your parsed values are JSON serializable,
but for advanced use cases you may use values such as Date, Map, or Set
that need to be transformed before JSON serialization. See the
[StateValueConfig](/docs/api/interfaces/lexical.StateValueConfig)
API documentation.

:::

## Efficiency

NodeState uses a copy-on-write scheme to manage each node's state. If
none of the state has changed, then the NodeState instance will be
shared across multiple versions of that node.

:::info

In a given reconciliation cycle, the first time a Lexical node is marked dirty
via `getWritable` will create a new instance of that node. All properties
of the previous version are set on the new instance. NodeState is stored
as a single property, and no copying of the internal state is done
until the NodeState itself is marked writable.

:::

When serializing to JSON, each key will only be stored if the value
is not equal to the default value. This can save quite a lot of space
and bandwidth.

Parsing and serialization is only done at network boundaries, when
integrating with JSON or Yjs. When a value changes from an external
source, it is only parsed once the first time it is read.
Values that do not come from external sources are not parsed, and
values that are not used are never parsed.

## Capabilities

Current:

- Allows you to define and add state to any node
- Serializes that state automatically in the node's JSON, supporting
  versioning and copy+paste
- Works with the reconciler, TextNodes with differing state will not
  be implicitly merged
- @lexical/yjs support, NodeState will be automatically synchronized
  like any other property
- NodeState values that are not used will simply pass-through, making
  it a bit easier for situations where multiple configurations are used
  on the same data (e.g. older and newer versions of your editor,
  a different set of plugins based on context, etc.).
- Pre-registration system for nodes to declare expected state
  and serialize them as top-level properties (`flat`) with `$config`
  (see [#7260](https://github.com/facebook/lexical/issues/7260)).

Future:

- Does not yet integrate directly with importDOM, createDOM or
  exportDOM (see [#7259](https://github.com/facebook/lexical/issues/7259))
- Does not yet support direct integration with Yjs, e.g.
  you can not store a Y.Map as a NodeState value
  (see [#7293](https://github.com/facebook/lexical/issues/7293))
- There isn't yet an easy way to listen for updates to NodeState
  without registering listeners for every class
  (see [#7321](https://github.com/facebook/lexical/pull/7321))
- Similarly, there isn't the equivalent of a node transform for
  NodeState. Transforms must be registered on individual node
  classes.

## Node State Style Example

This example demonstrates an advanced use case of storing a style object on TextNode using NodeState.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/facebook/lexical/tree/main/examples/node-state-style?file=src/main.tsx)

<iframe width="100%" height="600" src="https://stackblitz.com/github/facebook/lexical/tree/main/examples/node-state-style?embed=1&file=src%2FApp.tsx&terminalHeight=0&ctl=1&showSidebar=0&devtoolsheight=0&view=preview" sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts" title="Node State Style Example"></iframe>
