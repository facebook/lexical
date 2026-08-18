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
  SerializationSchema,
  SerializationSchemaFields,
  SerializationSchemaMeta,
} from 'lexical';

import * as fc from 'fast-check';
import {$isLexicalNode, getStaticNodeConfig} from 'lexical';

/**
 * Derive a {@link https://fast-check.dev | fast-check} arbitrary that generates
 * valid values for `schema` by walking its introspectable `meta`. Because the
 * schema is the same one the node uses to parse its JSON, the generated values
 * are exactly what the node's parser accepts — so a single declaration powers
 * both parsing and example generation in tests.
 *
 * @example
 * ```ts
 * fc.assert(
 *   fc.property(serializationSchemaArbitrary(textNodeSchema), (fields) => {
 *     // `fields` is a valid set of SerializedTextNode properties
 *   }),
 * );
 * ```
 */
export function serializationSchemaArbitrary<T>(
  schema: SerializationSchema<T>,
): fc.Arbitrary<T> {
  return metaArbitrary(schema.meta) as fc.Arbitrary<T>;
}

/**
 * Derive an arbitrary for a full serialized node of the given `type` (and
 * `version`) from its `schema`, suitable for feeding to `importJSON`.
 */
export function serializedNodeArbitrary<
  T extends {readonly [k: string]: unknown},
>(
  schema: SerializationSchema<T>,
  type: string,
  version = 1,
): fc.Arbitrary<T & {type: string; version: number}> {
  return serializationSchemaArbitrary(schema).map(fields => ({
    ...fields,
    type,
    version,
  }));
}

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
 * when their value has an introspectable schema. The result describes every
 * node-specific property of the class's serialized JSON.
 */
export function composeNodeSerializationSchema(
  klass: Klass<LexicalNode>,
): SerializationSchemaFields {
  const chain: Klass<LexicalNode>[] = [];
  let current: unknown = klass;
  while (isNodeClass(current)) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  const fields: {[key: string]: AnySerializationSchema} = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const {ownNodeConfig} = getStaticNodeConfig(chain[i]);
    if (!ownNodeConfig) {
      continue;
    }
    const {json, stateConfigs} = ownNodeConfig;
    if (json && json.meta.kind === 'object') {
      Object.assign(fields, json.meta.fields);
    }
    if (stateConfigs) {
      for (const required of stateConfigs) {
        if (
          'stateConfig' in required &&
          required.flat &&
          required.stateConfig.schema &&
          typeof required.stateConfig.key === 'string'
        ) {
          fields[required.stateConfig.key] = required.stateConfig.schema;
        }
      }
    }
  }
  return fields;
}

// A class is a Lexical node class if its prototype is a LexicalNode — i.e.
// `value.prototype instanceof LexicalNode`, which $isLexicalNode performs
// without needing the (non-value-exported) LexicalNode class.
function isNodeClass(value: unknown): value is Klass<LexicalNode> {
  return typeof value === 'function' && $isLexicalNode(value.prototype);
}

/**
 * Derive a fast-check arbitrary for the node-specific properties of `klass`'s
 * serialized JSON, composing the schemas it inherits ({@link composeNodeSerializationSchema})
 * — so an element-based node generates the properties it gets from ElementNode
 * as well as its own. Spread the result with `type`/`version` to feed
 * `importJSON`.
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
