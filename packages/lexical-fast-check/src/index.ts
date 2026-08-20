/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  AnySerializationSchema,
  Klass,
  LexicalNode,
  SerializationSchemaFields,
  SerializationSchemaMeta,
} from 'lexical';

import * as fc from 'fast-check';
import {getComposedSchemaFields, getStaticNodeConfig} from 'lexical';

/**
 * Read the {@link SerializationSchema} a node class declares on its `$config` (the `schema`
 * field), if any. This is the introspection entry point for tooling: the node
 * is the single source of truth and this returns the schema it published. The
 * `$config` is read from the prototype, so no editor or instance is required.
 */
export function nodeSerializationSchema(
  klass: Klass<LexicalNode>,
): AnySerializationSchema | undefined {
  const {ownNodeConfig} = getStaticNodeConfig(klass);
  return ownNodeConfig ? ownNodeConfig.json : undefined;
}

/**
 * Collect the serialized-property schemas a node inherits, walking from the
 * class up through its abstract bases (e.g. ElementNode, which declares its
 * schema under a well-known `Symbol.for('ElementNode')` key). Properties are
 * merged base-first so a subclass's schema overrides its ancestor's. Flat node
 * states (which serialize at the top level like schema fields) are included
 * when their value has an introspectable schema; a flat state re-declared by a
 * subclass keeps the ancestor's config, matching the shared node state built
 * by `createSharedNodeState`. The result describes every node-specific
 * property of the class's serialized JSON, mirroring what the base
 * `updateFromJSON` applies.
 */
export function composeNodeSerializationSchema(
  klass: Klass<LexicalNode>,
): SerializationSchemaFields {
  // The core composes this once per class for its own compiled setters and
  // getters; deriving from the same primitive is what keeps the properties
  // this generates in step with the ones a node actually parses and writes.
  return getComposedSchemaFields(klass);
}

/**
 * Derive a fast-check arbitrary for the node-specific properties of `klass`'s
 * serialized JSON, composing the schemas it inherits ({@link composeNodeSerializationSchema})
 * — so an element-based node generates the properties it gets from ElementNode
 * as well as its own. Spread the result with `type`/`version` to feed
 * `importJSON`. Because each property's schema is the same one the node uses
 * to parse its JSON, the generated values are exactly what the node's parser
 * accepts — a single declaration powers both parsing and example generation.
 *
 * Every property is generated independently as present or absent
 * (`requiredKeys: []`), because that is the domain the parsers actually face:
 * a `SerializedPartial` may omit any node-specific property — older documents
 * predate a property, and a compact export omits one whose value equals its
 * default. Generating complete records only would leave the defaulting path
 * (the whole point of a schema carrying a `defaultValue`) untested.
 */
export function nodeArbitrary(
  klass: Klass<LexicalNode>,
): fc.Arbitrary<{[key: string]: unknown}> {
  const fields = composeNodeSerializationSchema(klass);
  const record: {[key: string]: fc.Arbitrary<unknown>} = {};
  for (const key of Object.keys(fields)) {
    record[key] = metaArbitrary(fields[key].meta);
  }
  return fc.record(record, {requiredKeys: []});
}

function metaArbitrary(meta: SerializationSchemaMeta): fc.Arbitrary<unknown> {
  switch (meta.kind) {
    case 'string':
      return fc.string();
    case 'number': {
      const {min, max, integer} = meta;
      return integer
        ? fc.integer({max, min})
        : fc.double({max, min, noDefaultInfinity: true, noNaN: true});
    }
    case 'boolean':
      return fc.boolean();
    case 'enum':
      return fc.constantFrom(...meta.values);
    case 'array':
      return fc.array(metaArbitrary(meta.item.meta));
    case 'nullable':
      return fc.option(metaArbitrary(meta.inner.meta), {nil: null});
    case 'optional':
      return fc.option(metaArbitrary(meta.inner.meta), {nil: undefined});
    case 'union':
      return fc.oneof(
        ...meta.members.map(member => metaArbitrary(member.meta)),
      );
    case 'raw':
      // The schema deliberately does not describe this value's domain (its
      // owner validates it), so there is nothing to generate from.
      return fc.constant(undefined);
    case 'object': {
      const fields: {[key: string]: fc.Arbitrary<unknown>} = {};
      for (const key of Object.keys(meta.fields)) {
        fields[key] = metaArbitrary(meta.fields[key].meta);
      }
      return fc.record(fields);
    }
    default:
      // Unreachable for the schemas `lexical` defines — the switch is
      // exhaustive over SerializationSchemaMeta — but a hand-rolled schema
      // (or one from a newer core) can carry a kind this build has never
      // heard of. Say so, rather than returning undefined and failing inside
      // fast-check's record builder.
      throw new Error(
        `nodeArbitrary: unsupported serialization schema kind ${String(
          (meta as {kind?: unknown}).kind,
        )}`,
      );
  }
}
