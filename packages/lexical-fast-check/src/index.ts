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
import {getStaticNodeConfig, iterStaticNodeConfigChain} from 'lexical';

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
  // Walk the same config chain the core compiles its setters from
  // (iterStaticNodeConfigChain honors an explicit `extends` and severed
  // static prototype chains, e.g. Babel's loose class transform).
  const chain = [...iterStaticNodeConfigChain(klass)];
  // Maps rather than object literals: `'toString' in {}` is true, so an
  // object would silently exclude fields named after Object.prototype members.
  const fields = new Map<string, AnySerializationSchema>();
  const states = new Map<string, AnySerializationSchema>();
  for (let i = chain.length - 1; i >= 0; i--) {
    const {ownNodeConfig} = chain[i];
    if (!ownNodeConfig) {
      continue;
    }
    const {json, stateConfigs} = ownNodeConfig;
    if (json && json.meta.kind === 'object') {
      for (const [key, schema] of Object.entries(json.meta.fields)) {
        fields.set(key, schema);
      }
    }
    if (stateConfigs) {
      for (const required of stateConfigs) {
        if (
          'stateConfig' in required &&
          required.flat &&
          required.stateConfig.schema &&
          typeof required.stateConfig.key === 'string' &&
          !states.has(required.stateConfig.key)
        ) {
          states.set(required.stateConfig.key, required.stateConfig.schema);
        }
      }
    }
  }
  return {...Object.fromEntries(states), ...Object.fromEntries(fields)};
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
  }
}
