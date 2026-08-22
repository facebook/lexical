/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Compiling a serialization schema's domain to straight-line JavaScript, and
 * proving the result agrees with the schema it was compiled from.
 *
 * This is the portable half of `scripts/generate-node-json.mjs`: it knows about
 * {@link SerializationSchemaMeta} and nothing about node classes, so it can be
 * unit-tested against any schema rather than only the core classes that happen
 * to be code-generated today. It holds no module state — everything a compiled
 * expression needs comes back with it — which is what makes that possible.
 *
 * The import direction is the untrusted-JSON boundary, so
 * {@link verifyCompiledParse} is not optional politeness: a schema whose meta
 * does not fully determine its parse compiles to something plausible and wrong
 * (see {@link compileParse}), and only running the two against each other
 * catches it.
 */

/** @typedef {import('lexical').SerializationSchemaMeta} SchemaMeta */
/** @typedef {import('lexical').AnySerializationSchema} AnySchema */
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
const NUM_BODY = `  if (typeof v === 'number') {
    return Number.isFinite(v) ? v : d;
  }
  return typeof v === 'string' && JSON_NUMBER.test(v) ? Number(v) : d;`;

/** The `num` helper as TypeScript, for a module that emits a compiled parse. */
export const NUM_HELPER_SOURCE = `const JSON_NUMBER = ${JSON_NUMBER_SOURCE};

function num(v: unknown, d: number): number {
${NUM_BODY}
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
        // Compilable in principle, just not compiled yet: nothing generated
        // today has a constrained number on a field-backed property.
        throw new NotCompilable('a constrained numberValue');
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
    '0x10',
    '007',
    '+1',
    'Infinity',
    'NaN',
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
    `const {${['num', ...names].join(', ')}} = SCOPE; return (${expression});`,
  );
  // eslint-disable-next-line no-new-func
  const num = new Function('v', 'd', 'JSON_NUMBER', NUM_BODY);
  const jsonNumber = new RegExp(
    JSON_NUMBER_SOURCE.slice(1, JSON_NUMBER_SOURCE.lastIndexOf('/')),
  );
  const scope = {
    num: (/** @type {unknown} */ v, /** @type {number} */ d) =>
      num(v, d, jsonNumber),
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
}
