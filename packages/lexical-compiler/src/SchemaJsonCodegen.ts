/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as impl from './passes/schemaJsonCodegen.mjs';

/**
 * The introspectable description a serialization schema carries — the shape of
 * `SerializationSchemaMeta` from `lexical`, declared structurally so this
 * package needs no dependency on it. The kinds this module does not compile
 * share the final arm; {@link compileParse} refuses them with
 * {@link NotCompilable}.
 */
export type SchemaJsonMeta =
  | {readonly kind: 'string'}
  | {readonly kind: 'boolean'}
  | {
      readonly kind: 'number';
      readonly min?: number;
      readonly max?: number;
      readonly integer?: boolean;
    }
  | {readonly kind: 'enum'; readonly values: readonly unknown[]}
  | {
      readonly kind: 'aliased';
      readonly aliases: {readonly [alias: string]: unknown};
      readonly inner: {readonly meta: SchemaJsonMeta};
    }
  | {
      readonly kind:
        | 'array'
        | 'nullable'
        | 'object'
        | 'optional'
        | 'raw'
        | 'union';
    };

/**
 * The callable schema a compiled parse is verified against — the shape of
 * `SerializationSchema` from `lexical`, structurally.
 */
export interface SchemaJsonSchema {
  (value: unknown): unknown;
  readonly defaultValue: unknown;
  readonly meta: SchemaJsonMeta;
}

/** A lookup table a compiled expression refers to by name. */
export interface SchemaJsonTable {
  name: string;
  table: {readonly [key: string]: unknown};
}

export interface CompileParseResult {
  /** A JavaScript expression over `v` that parses exactly as the schema does. */
  expression: string;
  /**
   * The lookup tables the expression refers to. The caller decides where they
   * live; a table an untrusted key reaches must be given a null prototype.
   */
  tables: SchemaJsonTable[];
}

export interface VerifyCompiledParseOptions {
  /** The real schema, called for the expected value. */
  schema: SchemaJsonSchema;
  /** A compiled expression over `v`, usually from {@link compileParse}. */
  expression: string;
  /** The tables the expression refers to. */
  tables: readonly SchemaJsonTable[];
  /**
   * Which of the tables an untrusted key can reach, and so must not inherit
   * from `Object.prototype`. Verified by running the hostile keys in
   * {@link verificationCorpus} through the expression.
   */
  nullPrototypeTables?: readonly string[];
}

/**
 * A schema whose domain cannot be expressed as straight-line code, or a
 * compiled expression that turned out to disagree with it.
 */
export const NotCompilable: new (message: string) => Error = impl.NotCompilable;

/**
 * The JSON number grammar, anchored, as source text — matching `numberValue`'s
 * treatment of a stringified number. Kept as one string so an emitted module
 * and the verification here are the same regexp rather than two copies that
 * could drift.
 */
export const JSON_NUMBER_SOURCE: string = impl.JSON_NUMBER_SOURCE;

/**
 * The `num` helper a compiled expression calls, as TypeScript source, for a
 * module that emits one. The verification evaluates the same body, so the
 * emitted helper and the checked one cannot be different functions.
 */
export const NUM_HELPER_SOURCE: string = impl.NUM_HELPER_SOURCE;

/**
 * A JavaScript literal denoting `value`, or the token `undefined`. Faithful
 * only for the primitives JSON round-trips — which is exactly what a caller
 * emitting a comparison against it must check first.
 */
export function literal(value: unknown): string {
  return impl.literal(value);
}

/**
 * A JavaScript expression over `v` that parses exactly as `meta`'s schema
 * does, with any lookup tables it needs. Only the kinds whose meta fully
 * determines the parse are compiled; the rest throw {@link NotCompilable}.
 * Compiling is not trusting — run the result through
 * {@link verifyCompiledParse} before emitting it, since a schema whose meta
 * does not determine its parse (a `transformValue`) compiles to something
 * plausible and wrong that no inspection of the meta can reveal.
 */
export function compileParse(
  meta: SchemaJsonMeta,
  defaultValue: unknown,
  tableBaseName: string,
): CompileParseResult {
  return impl.compileParse(meta, defaultValue, tableBaseName);
}

/**
 * The values a compiled parse is checked against: whatever the schema itself
 * names — every enum member, both sides of every alias — plus the shapes
 * untrusted JSON actually arrives in, `Object.prototype` member names
 * included. Fixed rather than sampled, so a generator using it produces
 * byte-reproducible output.
 */
export function verificationCorpus(meta: SchemaJsonMeta): unknown[] {
  return impl.verificationCorpus(meta);
}

/**
 * Run a compiled expression against the schema it claims to reproduce, over
 * {@link verificationCorpus}, and throw {@link NotCompilable} naming the first
 * value they disagree on. This is the step that keeps a generated parser from
 * shipping with different behavior than the schema it was compiled from.
 */
export function verifyCompiledParse(options: VerifyCompiledParseOptions): void {
  impl.verifyCompiledParse(options);
}

/**
 * Prove a lookup table maps every value `schema` can produce, for an emitted
 * lookup whose miss-fallback must be dead code: a domain member missing from
 * the table would otherwise be silently stored as whatever the default
 * encodes to.
 */
export function verifyTableCoversDomain(options: {
  schema: SchemaJsonSchema;
  table: {readonly [key: string]: unknown};
}): void {
  impl.verifyTableCoversDomain(options);
}
