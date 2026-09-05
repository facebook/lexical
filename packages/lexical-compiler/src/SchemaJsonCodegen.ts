/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Compiling a serialization schema's domain to straight-line JavaScript, and
 * proving the result agrees with the schema it was compiled from — the
 * `@lexical/compiler/SchemaJsonCodegen` entry point.
 * `scripts/generate-node-json.mjs` is its in-tree consumer, generating the
 * core node classes' serializers; a build generating serializers for its own
 * node classes uses the same functions.
 *
 * It is typed against `lexical`'s own `SerializationSchemaMeta` and
 * `SerializationSchema` — a type-only dependency, erased from the emitted
 * module — rather than a structural copy of them, so a kind added to the meta
 * is a type error here rather than a silent fall-through. The generator's
 * first phase loads this file under plain Node, which strips the types
 * itself: that is why the import below is a type-only statement, which Node
 * erases whole, and why nothing in here is more than erasable syntax.
 *
 * It knows about a schema's introspectable `meta` and nothing about node
 * classes, and holds no module state — everything a compiled expression needs
 * comes back with it — which is what makes it testable against any schema.
 *
 * The import direction is the untrusted-JSON boundary, so
 * {@link verifyCompiledParse} is not optional politeness: a schema whose meta
 * does not fully determine its parse compiles to something plausible and wrong
 * (see {@link compileParse}), and only running the two against each other
 * catches it.
 */

import type {AnySerializationSchema, SerializationSchemaMeta} from 'lexical';

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
  schema: AnySerializationSchema;
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
export class NotCompilable extends Error {}

/**
 * The JSON number grammar, anchored, as source text — matching `numberValue`'s
 * treatment of a stringified number. Kept as one string so an emitted module
 * and the verification here are the same regexp rather than two copies that
 * could drift.
 */
export const JSON_NUMBER_SOURCE =
  '/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/';

/**
 * The body of the `num` helper a compiled expression calls, with no type
 * annotations so that the same text can be emitted into TypeScript (wrapped by
 * {@link NUM_HELPER_SOURCE}) and evaluated for verification. Two spellings of
 * this logic is exactly the drift the verification exists to prevent, so there
 * is only one.
 *
 * @internal
 */
export const NUM_BODY = `  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : d;
  }
  if (typeof v !== 'string' || !JSON_NUMBER.test(v)) {
    return d;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : d;`;

/**
 * The constrained mirror of {@link NUM_BODY}, for `numberValue`'s `min`/`max`/
 * `integer` options. Applied to what `num` returned rather than to the input,
 * exactly as `numberValue` tests its coerced value — and falling back to `d`
 * either way, which is what `numberValue` does when the domain rejects it,
 * including for a default that is itself out of range.
 */
const NUM_RANGE_BODY = `  const n = num(v, d);
  return n >= min && n <= max && (!integer || Number.isInteger(n)) ? n : d;`;

/**
 * The `num` helper as TypeScript source, for a module that emits a compiled
 * parse. The verification evaluates the same body, so the emitted helper and
 * the checked one cannot be different functions.
 */
export const NUM_HELPER_SOURCE = `const JSON_NUMBER = ${JSON_NUMBER_SOURCE};

function num(v: unknown, d: number): number {
${NUM_BODY}
}`;

/** The `numC` helper, emitted alongside `num` when a domain is constrained. */
export const NUM_RANGE_HELPER_SOURCE = `function numC(
  v: unknown,
  d: number,
  min: number,
  max: number,
  integer: boolean,
): number {
${NUM_RANGE_BODY}
}`;

/**
 * A JavaScript literal denoting `value`, or the token `undefined`. Faithful
 * only for the primitives JSON round-trips — which is exactly what a caller
 * emitting a comparison against it must check first.
 */
export function literal(value: unknown): string {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

/**
 * A JavaScript expression over `v` that parses exactly as `meta`'s schema does,
 * with any lookup tables it needs.
 *
 * Only the kinds whose meta fully determines the parse are compiled; the rest
 * throw {@link NotCompilable}. A `transformValue` post-processes what its meta
 * describes and keeps the function to itself, so its meta is indistinguishable
 * from its inner schema's — compiling one yields an expression that stores the
 * un-transformed value, and no inspection of the meta can tell. That is what
 * {@link verifyCompiledParse} is for: compiling is not trusting.
 *
 * Any lookup table the expression needs is returned with it rather than
 * registered somewhere: the caller decides where tables live, and a compile
 * that throws leaves nothing behind.
 *
 * @param meta the schema's introspectable description
 * @param defaultValue the schema's own default, i.e. `schema(undefined)`
 * @param tableBaseName prefix for any lookup table the expression needs
 */
export function compileParse(
  meta: SerializationSchemaMeta,
  defaultValue: unknown,
  tableBaseName: string,
): CompileParseResult {
  const tables: SchemaJsonTable[] = [];
  const expression = compile(meta, defaultValue, tableBaseName, tables);
  return {expression, tables};
}

function compile(
  meta: SerializationSchemaMeta,
  defaultValue: unknown,
  base: string,
  tables: SchemaJsonTable[],
): string {
  const fallback = literal(defaultValue);
  switch (meta.kind) {
    case 'string':
      return `typeof v === 'string' ? v : ${fallback}`;
    case 'boolean':
      return `typeof v === 'boolean' ? v : ${fallback}`;
    case 'enum': {
      // `undefined` is checked before membership by enumValue, so a member
      // spelled undefined can never be matched here — dropping it from the
      // comparisons reproduces that exactly.
      const tests = meta.values
        .filter(value => value !== undefined)
        .map(value => `v === ${literal(value)}`);
      return tests.length === 0
        ? fallback
        : `${tests.join(' || ')} ? v : ${fallback}`;
    }
    case 'number': {
      if (meta.min !== undefined || meta.max !== undefined || meta.integer) {
        // The bounds are emitted as source rather than through `literal`,
        // which renders a non-finite number as `null`: an absent bound is
        // exactly ±Infinity, and JSON.stringify cannot say so.
        const min = meta.min === undefined ? '-Infinity' : String(meta.min);
        const max = meta.max === undefined ? 'Infinity' : String(meta.max);
        return `numC(v, ${fallback}, ${min}, ${max}, ${Boolean(meta.integer)})`;
      }
      return `num(v, ${fallback})`;
    }
    case 'aliased': {
      // Suffixed after the first, so nesting cannot collide.
      const name = tables.length === 0 ? base : `${base}_${tables.length + 1}`;
      tables.push({name, table: meta.aliases});
      const inner = compile(meta.inner.meta, defaultValue, base, tables);
      // `in` rather than a bare lookup, and whoever emits this table has to
      // give it a null prototype: the key comes straight out of untrusted
      // JSON, so `'toString'` would otherwise resolve to Object.prototype's
      // method and be stored as this property's value. Naming the table in
      // `nullPrototypeTables` is what makes verifyCompiledParse check it.
      return `typeof v === 'string' && v in ${name} ? ${name}[v] : ${inner}`;
    }
    default:
      throw new NotCompilable(`a ${meta.kind} schema`);
  }
}

/**
 * The values a compiled parse is checked against: whatever the schema itself
 * names — every enum member, both sides of every alias — plus the shapes
 * untrusted JSON actually arrives in, `Object.prototype` member names
 * included. Fixed rather than sampled, so a generator using it produces
 * byte-reproducible output.
 */
export function verificationCorpus(meta: SerializationSchemaMeta): unknown[] {
  const values: unknown[] = [
    undefined,
    null,
    true,
    false,
    0,
    1,
    -1,
    1.5,
    NaN,
    Infinity,
    -Infinity,
    '',
    ' ',
    '0',
    '1',
    '-1',
    '1.5',
    '1e3',
    // Well-formed JSON numbers that coerce out of the finite domain, so a
    // compiled parse that stops at the grammar disagrees with numberValue.
    '1e999',
    '-1e999',
    '0x10',
    '007',
    '+1',
    'Infinity',
    'NaN',
    // The edges of the JSON number grammar itself, each one a place the
    // emitted regexp and numberValue's could be edited apart: a bare
    // fraction, a trailing point, a signed zero, an exponent with no digits,
    // an uppercase or signed exponent, and surrounding whitespace.
    '.5',
    '5.',
    '-0',
    '1e',
    '1E5',
    '1.5e3',
    '1e+3',
    '1e-3',
    ' 1',
    '1 ',
    '1_000',
    '--1',
    'banana',
    'toString',
    'constructor',
    '__proto__',
    'hasOwnProperty',
    'valueOf',
    {},
    [],
    [1],
    {a: 1},
  ];
  const walk = (m: SerializationSchemaMeta): void => {
    if (m.kind === 'enum') {
      values.push(...m.values);
    } else if (m.kind === 'aliased') {
      values.push(...Object.keys(m.aliases), ...Object.values(m.aliases));
      walk(m.inner.meta);
    }
  };
  walk(meta);
  return values;
}

/**
 * Run a compiled expression against the schema it claims to reproduce, over
 * {@link verificationCorpus}, and throw {@link NotCompilable} naming the first
 * value they disagree on. This is the step that keeps a generated parser from
 * shipping with different behavior than the schema it was compiled from.
 *
 * A caller that applies a table *after* parsing — an `encode` turning a
 * serialized name into its stored form — verifies that separately with
 * {@link verifyTableCoversDomain}, which proves the table total rather than
 * sampling it. Keeping the two apart is what lets this check the expression the
 * generated code actually contains, rather than a closure wrapped around it for
 * the occasion.
 */
export function verifyCompiledParse({
  expression,
  nullPrototypeTables = [],
  schema,
  tables,
}: VerifyCompiledParseOptions): void {
  const names = tables.map(({name}) => name);
  const nullProto = new Set(nullPrototypeTables);
  // This is the point of the exercise: the expression that is about to be
  // written into a generated module is compiled and run here, against the
  // schema it claims to reproduce, so a disagreement is a build failure rather
  // than a parser that silently stores the wrong value. Build-time only, over a
  // fixed corpus, with nothing untrusted in scope. A `Function` built from
  // source has no static type, hence the casts to what each body takes.
  // eslint-disable-next-line no-new-func
  const compiled = new Function(
    'v',
    'SCOPE',
    `const {${['num', 'numC', ...names].join(', ')}} = SCOPE; return (${expression});`,
  ) as (v: unknown, scope: {readonly [key: string]: unknown}) => unknown;
  // eslint-disable-next-line no-new-func
  const num = new Function('v', 'd', 'JSON_NUMBER', NUM_BODY) as (
    value: unknown,
    fallback: number,
    jsonNumber: RegExp,
  ) => number;
  // eslint-disable-next-line no-new-func
  const numC = new Function(
    'v',
    'd',
    'min',
    'max',
    'integer',
    'num',
    NUM_RANGE_BODY,
  ) as (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
    integer: boolean,
    parse: (raw: unknown, ifInvalid: number) => number,
  ) => number;
  const jsonNumber = new RegExp(
    JSON_NUMBER_SOURCE.slice(1, JSON_NUMBER_SOURCE.lastIndexOf('/')),
  );
  const boundNum = (v: unknown, d: number): number => num(v, d, jsonNumber);
  const scope: {[key: string]: unknown} = {
    num: boundNum,
    numC: (v: unknown, d: number, min: number, max: number, integer: boolean) =>
      numC(v, d, min, max, integer, boundNum),
  };
  for (const {name, table} of tables) {
    scope[name] = nullProto.has(name)
      ? Object.assign(Object.create(null), table)
      : {...table};
  }
  for (const value of verificationCorpus(schema.meta)) {
    const want = schema(value);
    const got = compiled(value, scope);
    // Object.is, so NaN matches NaN and 0 does not match -0.
    if (!Object.is(want, got)) {
      throw new NotCompilable(
        `disagrees with its schema on ${literal(value)}: schema says ${literal(
          want,
        )}, generated says ${literal(got)}`,
      );
    }
  }
}

/**
 * Prove a lookup table maps every value `schema` can produce, and — for an
 * enum, where the domain is decidable — nothing else.
 *
 * A generated parse that ends in a table lookup emits a fallback for the key
 * that is not there, because the emitted TypeScript needs one. That fallback is
 * only ever *right* if it is unreachable: a domain member missing from the
 * table would otherwise be stored as whatever the default encodes to, silently
 * turning one value into another. So the table has to be total, and this is
 * where that is established rather than assumed.
 */
export function verifyTableCoversDomain({
  schema,
  table,
}: {
  schema: AnySerializationSchema;
  table: {readonly [key: string]: unknown};
}): void {
  const {meta} = schema;
  const produced = new Set(
    verificationCorpus(meta).map(value => schema(value)),
  );
  if (meta.kind === 'enum') {
    // Every member, whether or not the corpus happened to reach it.
    for (const value of meta.values) {
      produced.add(schema(value));
    }
  }
  for (const value of produced) {
    // Compared as the property key the lookup would use.
    if (!Object.prototype.hasOwnProperty.call(table, String(value))) {
      throw new NotCompilable(
        `has no table entry for ${literal(value)}, which its schema produces`,
      );
    }
  }
  if (meta.kind === 'enum') {
    // The converse, which only an enum makes decidable: a key the schema can
    // never produce is a member the table's author knows about and the enum
    // does not — one list was extended and the other was not — and import
    // would coerce that value to the default without anything noticing.
    const domain = new Set(meta.values.map(String));
    for (const key of Object.keys(table)) {
      if (!domain.has(key)) {
        throw new NotCompilable(
          `has a table entry for ${literal(key)} that its enum cannot produce`,
        );
      }
    }
  }
}

/**
 * Whether `literal(value)` evaluates back to a value that is `===` this one,
 * which is what an emitted comparison against it needs in order to mean what
 * the walk's `value === defaultValue` means.
 *
 * True for the primitives JSON round-trips. False for an object or array — a
 * literal allocates a fresh one, never `===` the default the walk holds — and
 * for a non-finite number, which `JSON.stringify` renders as `null`. `-0` is
 * rendered as `0`, which is fine: `-0 !== 0` is false either way.
 */
function hasFaithfulLiteral(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return (
    value === undefined ||
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  );
}

/**
 * A JavaScript expression over the variable `name`, true exactly when a value
 * of `schema` is *not* its default — the negation of the walk's
 * `value === defaultValue || isEqual(value, defaultValue)`, which is what the
 * compact form tests before writing a property, and what a property gated by a
 * predicate tests before calling it.
 *
 * A primitive default compares against its literal. A reference-typed default
 * has no literal a value could be `===`; the walk compares those through the
 * schema's own equality, and the one such equality this can restate from the
 * default alone is `arrayValue`'s against an empty array, which reduces to a
 * length test. Anything else — an object, a non-empty array, a non-finite
 * number — throws {@link NotCompilable}. Like a compiled parse, the result is
 * a claim about the schema, not a fact about it: run it through
 * {@link verifyDiffersFromDefault} before emitting it.
 *
 * @param schema the property's schema
 * @param name the variable holding the value
 */
export function compileDiffersFromDefault(
  schema: AnySerializationSchema,
  name: string,
): string {
  const {defaultValue} = schema;
  if (hasFaithfulLiteral(defaultValue)) {
    return `${name} !== ${literal(defaultValue)}`;
  }
  if (
    schema.meta.kind === 'array' &&
    schema.isEqual !== undefined &&
    Array.isArray(defaultValue) &&
    defaultValue.length === 0
  ) {
    return `!(Array.isArray(${name}) && ${name}.length === 0)`;
  }
  throw new NotCompilable(
    `has a default with no faithful literal (${literal(defaultValue)})`,
  );
}

/**
 * Run a {@link compileDiffersFromDefault} expression against the schema's own
 * rule — `value === defaultValue || isEqual(value, defaultValue)`, negated —
 * and throw {@link NotCompilable} naming the first value they disagree on.
 *
 * The values are {@link verificationCorpus} plus the default itself, a copy of
 * it (which is `===` to nothing the schema holds), and the array and object
 * shapes a structural comparison could confuse. A schema's `isEqual` is a
 * function its meta does not describe — a `transformValue` may declare any
 * equality over a primitive domain — so a literal comparison can be plausible
 * and wrong, and only running the two against each other catches it.
 */
export function verifyDiffersFromDefault({
  expression,
  name,
  schema,
}: {
  expression: string;
  name: string;
  schema: AnySerializationSchema;
}): void {
  const {defaultValue, isEqual} = schema;
  // Build-time only, over a fixed corpus, with nothing untrusted in scope.
  // eslint-disable-next-line no-new-func
  const compiled = new Function(name, `return (${expression});`) as (
    value: unknown,
  ) => unknown;
  const copy = Array.isArray(defaultValue)
    ? [...defaultValue]
    : defaultValue !== null && typeof defaultValue === 'object'
      ? {...defaultValue}
      : defaultValue;
  const values: unknown[] = [
    ...verificationCorpus(schema.meta),
    defaultValue,
    copy,
    [],
    [0],
    ['a'],
    [undefined],
    new Array(1),
    {},
    {length: 0},
  ];
  for (const value of values) {
    const want = !(
      value === defaultValue ||
      (isEqual !== undefined && isEqual(value, defaultValue))
    );
    const got = Boolean(compiled(value));
    if (want !== got) {
      throw new NotCompilable(
        `disagrees with its schema on whether ${literal(
          value,
        )} is the default: schema says ${want ? 'no' : 'yes'}, generated says ${
          got ? 'no' : 'yes'
        }`,
      );
    }
  }
}
