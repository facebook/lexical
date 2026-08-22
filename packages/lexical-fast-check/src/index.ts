/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Klass, LexicalNode, SerializationSchemaMeta} from 'lexical';

import * as fc from 'fast-check';
import {getComposedSchemaFields} from 'lexical';

/**
 * Derive a fast-check arbitrary for the node-specific properties of `klass`'s
 * serialized JSON, composing the schemas it inherits
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
  const fields = getComposedSchemaFields(klass);
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
    case 'aliased':
      // The aliases are legacy input spellings the schema still accepts, so
      // they belong in the generated domain exactly as much as the inner one
      // does — that is what makes them worth stating as data.
      return fc.oneof(
        metaArbitrary(meta.inner.meta),
        fc.constantFrom(...Object.keys(meta.aliases)),
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
