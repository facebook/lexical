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
 * implementation behind `@lexical/compiler/SchemaJsonCodegen`, whose typed
 * facade is `src/SchemaJsonCodegen.ts`. `scripts/generate-node-json.mjs` is
 * its in-tree consumer, generating the core node classes' serializers; a
 * build generating serializers for its own node classes uses the same
 * functions.
 *
 * A pass lives here as plain JavaScript for bootstrapping reasons — the
 * generator's first phase runs under plain node, before anything has been
 * compiled. Its types are JSDoc, structural rather than imported from
 * `lexical` so this package carries no dependency on it, and
 * `tsconfig.scripts.json` type-checks this directory with `checkJs` and
 * `strict`.
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

/**
 * The introspectable description a serialization schema carries, structurally:
 * the shape of `SerializationSchemaMeta` from `lexical`, declared here so this
 * package needs no dependency on it. A union discriminated on `kind`, so the
 * compile switch narrows; the kinds this module does not compile share the
 * final arm and land in its default branch.
 *
 * @typedef {(
 *   {readonly kind: 'string'} |
 *   {readonly kind: 'boolean'} |
 *   {
 *     readonly kind: 'number',
 *     readonly min?: number,
 *     readonly max?: number,
 *     readonly integer?: boolean,
 *   } |
 *   {readonly kind: 'enum', readonly values: readonly unknown[]} |
 *   {
 *     readonly kind: 'aliased',
 *     readonly aliases: {readonly [alias: string]: unknown},
 *     readonly inner: {readonly meta: SchemaMeta},
 *   } |
 *   {readonly kind: 'array' | 'nullable' | 'object' | 'optional' | 'raw' | 'union'}
 * )} SchemaMeta
 */
/**
 * The callable schema itself, structurally: the shape of
 * `SerializationSchema` from `lexical`.
 *
 * @typedef {{
 *   (value: unknown): unknown,
 *   readonly defaultValue: unknown,
 *   readonly meta: SchemaMeta,
 *   readonly isEqual?: (a: any, b: any) => boolean,
 * }} AnySchema
 */
/** @typedef {{readonly [key: string]: unknown}} Table */
/** @typedef {{name: string, table: Table}} NamedTable */

/**
 * A schema whose domain cannot be expressed as straight-line code, or a
 * compiled expression that turned out to disagree with it.
 */
export class NotCompilable extends Error {}

/**
 * The JSON number grammar, anchored, matching `numberValue`. Kept here as the
 * source text so the emitted module and the verification below are the same
 * regexp rather than two copies that could drift.
 */
export const JSON_NUMBER_SOURCE =
  '/^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?$/';

/**
 * The body of the `num` helper a compiled expression calls, with no type
 * annotations so that the same text can be emitted into TypeScript (wrapped by
 * {@link NUM_HELPER_SOURCE}) and evaluated for verification. Two spellings of
 * this logic is exactly the drift the verification exists to prevent, so there
 * is only one.
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

/** The `num` helpers as TypeScript, for a module that emits a compiled parse. */
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

/** @param {unknown} value @returns {string} */
export function literal(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

/**
 * A JavaScript expression over `v` that parses exactly as `meta`'s schema does.
 *
 * Only the kinds whose meta fully determines the parse are compiled. A
 * `transformValue` post-processes what its meta describes and keeps the
 * function to itself, so its meta is indistinguishable from its inner
 * schema's — compiling one yields an expression that stores the un-transformed
 * value, and no inspection of the meta can tell. That is what
 * {@link verifyCompiledParse} is for.
 *
 * Any lookup table the expression needs is returned with it rather than
 * registered somewhere: the caller decides where tables live, and a compile
 * that throws leaves nothing behind.
 *
 * @param {SchemaMeta} meta
 * @param {unknown} defaultValue the schema's own default, i.e. `schema(undefined)`
 * @param {string} tableBaseName prefix for any lookup table the expression needs
 * @returns {{expression: string, tables: NamedTable[]}}
 */
export function compileParse(meta, defaultValue, tableBaseName) {
  /** @type {NamedTable[]} */
  const tables = [];
  const expression = compile(meta, defaultValue, tableBaseName, tables);
  return {expression, tables};
}

/**
 * @param {SchemaMeta} meta
 * @param {unknown} defaultValue
 * @param {string} base
 * @param {NamedTable[]} tables
 * @returns {string}
 */
function compile(meta, defaultValue, base, tables) {
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
 * Values a compiled parse is checked against: whatever the schema itself names
 * — every enum member, every alias, both sides of every alias — plus the shapes
 * untrusted JSON actually arrives in, including the `Object.prototype` member
 * names a lookup table must not resolve. Fixed rather than sampled, so a
 * generator that uses this produces byte-reproducible output.
 *
 * @param {SchemaMeta} meta
 * @returns {unknown[]}
 */
export function verificationCorpus(meta) {
  /** @type {unknown[]} */
  const values = [
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
  const walk = (/** @type {SchemaMeta} */ m) => {
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
 * value they disagree on.
 *
 * A caller that applies a table *after* parsing — an `encode` turning a
 * serialized name into its stored form — verifies that separately with
 * {@link verifyTableCoversDomain}, which proves the table total rather than
 * sampling it. Keeping the two apart is what lets this check the expression the
 * generated code actually contains, rather than a closure wrapped around it for
 * the occasion.
 *
 * @param {object} args
 * @param {AnySchema} args.schema the real schema, called for the expected value
 * @param {string} args.expression a compiled expression over `v`
 * @param {readonly NamedTable[]} args.tables tables the expression refers to
 * @param {readonly string[]} [args.nullPrototypeTables] which of them an
 *   untrusted key can reach, and so must not inherit from Object.prototype
 * @returns {void}
 */
export function verifyCompiledParse({
  expression,
  nullPrototypeTables = [],
  schema,
  tables,
}) {
  const names = tables.map(({name}) => name);
  const nullProto = new Set(nullPrototypeTables);
  // This is the point of the exercise: the expression that is about to be
  // written into a generated module is compiled and run here, against the
  // schema it claims to reproduce, so a disagreement is a build failure rather
  // than a parser that silently stores the wrong value. Build-time only, over a
  // fixed corpus, with nothing untrusted in scope.
  // eslint-disable-next-line no-new-func
  const compiled = new Function(
    'v',
    'SCOPE',
    `const {${['num', 'numC', ...names].join(', ')}} = SCOPE; return (${expression});`,
  );
  // eslint-disable-next-line no-new-func
  const num = new Function('v', 'd', 'JSON_NUMBER', NUM_BODY);
  // eslint-disable-next-line no-new-func
  const numC = new Function(
    'v',
    'd',
    'min',
    'max',
    'integer',
    'num',
    NUM_RANGE_BODY,
  );
  const jsonNumber = new RegExp(
    JSON_NUMBER_SOURCE.slice(1, JSON_NUMBER_SOURCE.lastIndexOf('/')),
  );
  const scope = {
    num: (/** @type {unknown} */ v, /** @type {number} */ d) =>
      num(v, d, jsonNumber),
    numC: (
      /** @type {unknown} */ v,
      /** @type {number} */ d,
      /** @type {number} */ min,
      /** @type {number} */ max,
      /** @type {boolean} */ integer,
    ) =>
      numC(
        v,
        d,
        min,
        max,
        integer,
        (/** @type {unknown} */ x, /** @type {number} */ y) =>
          num(x, y, jsonNumber),
      ),
    ...Object.fromEntries(
      tables.map(({name, table}) => [
        name,
        nullProto.has(name)
          ? Object.assign(Object.create(null), table)
          : {...table},
      ]),
    ),
  };
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
 * Prove a lookup table maps every value `schema` can produce.
 *
 * A generated parse that ends in a table lookup emits a fallback for the key
 * that is not there, because the emitted TypeScript needs one. That fallback is
 * only ever *right* if it is unreachable: a domain member missing from the
 * table would otherwise be stored as whatever the default encodes to, silently
 * turning one value into another. So the table has to be total, and this is
 * where that is established rather than assumed.
 *
 * @param {object} args
 * @param {AnySchema} args.schema
 * @param {Table} args.table
 * @returns {void}
 */
export function verifyTableCoversDomain({schema, table}) {
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
    if (
      !Object.prototype.hasOwnProperty.call(
        table,
        /** @type {string} */ (value),
      )
    ) {
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
    // Compared as property keys, which is what the lookup above compares.
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
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function hasFaithfulLiteral(value) {
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
 * @param {AnySchema} schema
 * @param {string} name the variable holding the value
 * @returns {string}
 */
export function compileDiffersFromDefault(schema, name) {
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
 *
 * @param {object} args
 * @param {string} args.expression a compiled expression over `name`
 * @param {string} args.name
 * @param {AnySchema} args.schema
 * @returns {void}
 */
export function verifyDiffersFromDefault({expression, name, schema}) {
  const {defaultValue, isEqual} = schema;
  // Build-time only, over a fixed corpus, with nothing untrusted in scope.
  // eslint-disable-next-line no-new-func
  const compiled = new Function(name, `return (${expression});`);
  const copy = Array.isArray(defaultValue)
    ? [...defaultValue]
    : defaultValue !== null && typeof defaultValue === 'object'
      ? {...defaultValue}
      : defaultValue;
  const values = [
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
