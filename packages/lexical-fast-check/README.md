# `@lexical/fast-check`

[![See API Documentation](https://lexical.dev/img/see-api-documentation.svg)](https://lexical.dev/docs/api/modules/lexical_fast_check)

This package derives [fast-check](https://fast-check.dev) arbitraries from the
JSON schemas Lexical nodes declare on `$config`, so property-based tests
generate exactly the serialized JSON a node's parser accepts.

Install it alongside `fast-check`, which is a peer dependency:

```sh
npm install --save-dev @lexical/fast-check fast-check
```

## Usage

`nodeArbitrary(NodeClass)` generates the node-specific properties of a
serialized node, composing the schemas the class inherits (an element-based
node also gets `direction`/`format`/`indent`/… from `ElementNode`). Every
property is generated independently as present or absent, because that is the
domain parsers actually face: an older document predates a property, and a
compact export omits one whose value equals its default.

```ts
import {nodeArbitrary} from '@lexical/fast-check';
import * as fc from 'fast-check';

fc.assert(
  fc.property(nodeArbitrary(MyNode), props => {
    const json = {...props, type: 'my-node'};
    // importing and re-exporting is a fixed point
    expect(exportOf(importOf(json))).toEqual(exportOf(importOf(exportOf(importOf(json)))));
  }),
);
```

Two lower-level helpers are also exported for tooling that wants to inspect
what a node declares:

- `nodeSerializationSchema(NodeClass)` — the `json` schema the class itself
  declares, if any.
- `composeNodeSerializationSchema(NodeClass)` — every node-specific property
  of the class's serialized JSON, including those inherited from its abstract
  bases and any flat `NodeState` whose value schema is introspectable.

Both read the class's `$config`, so no editor or node instance is required — but
resolving it injects the class's synthesized statics and compiles its accessor
tables, so a class whose schema names an accessor it does not have throws here.
