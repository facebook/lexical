/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  aliasedValue,
  type AnySerializationSchema,
  arrayValue,
  booleanValue,
  enumValue,
  nullable,
  numberValue,
  objectValue,
  optional,
  rawValue,
  stringValue,
  transformValue,
  unionValue,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  compileDiffersFromDefault,
  compileParse,
  JSON_NUMBER_SOURCE,
  NotCompilable,
  NUM_BODY,
  NUM_HELPER_SOURCE,
  verificationCorpus,
  verifyCompiledParse,
  verifyDiffersFromDefault,
  verifyTableCoversDomain,
} from '../../passes/schemaJsonCodegen.mjs';

/**
 * Build and run a compiled parse the way the generator's output does, so a
 * test asserts on behavior rather than on the expression text.
 */
function compiled(schema: AnySerializationSchema): (value: unknown) => unknown {
  const {expression, tables} = compileParse(
    schema.meta,
    schema.defaultValue,
    'T',
  );
  const names = tables.map(({name}) => name);
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'v',
    'SCOPE',
    `const {num, ${['_', ...names].join(', ')}} = SCOPE; return (${expression});`,
  );
  // Built from the same source text the generator emits and
  // verifyCompiledParse evaluates. Spelling it out here instead would be a
  // third copy of the number grammar, and a copy that silently kept passing
  // while the real helper changed is precisely what this checks against.
  // eslint-disable-next-line no-new-func
  const numFn = new Function('v', 'd', 'JSON_NUMBER', NUM_BODY);
  const jsonNumber = new RegExp(
    JSON_NUMBER_SOURCE.slice(1, JSON_NUMBER_SOURCE.lastIndexOf('/')),
  );
  const scope: {[key: string]: unknown} = {
    _: undefined,
    num: (v: unknown, d: number) => numFn(v, d, jsonNumber),
  };
  for (const {name, table} of tables) {
    scope[name] = Object.assign(Object.create(null), table);
  }
  return value => fn(value, scope);
}

/** Every value the corpus covers has to agree, which is the real contract. */
function expectAgrees(schema: AnySerializationSchema): void {
  const run = compiled(schema);
  for (const value of verificationCorpus(schema.meta)) {
    expect({in: value, out: run(value)}).toEqual({
      in: value,
      out: schema(value),
    });
  }
}

describe('compileParse reproduces the schema it compiles', () => {
  test('stringValue', () => {
    expectAgrees(stringValue());
    expectAgrees(stringValue('fallback'));
  });

  test('booleanValue', () => {
    expectAgrees(booleanValue());
    expectAgrees(booleanValue(true));
  });

  test('numberValue', () => {
    expectAgrees(numberValue());
    expectAgrees(numberValue(7));
    // Including the stringified-number domain, which is the part a naive
    // `Number(v)` would get wrong for '0x10' and ''.
    const run = compiled(numberValue());
    expect(run('42')).toBe(42);
    expect(run('0x10')).toBe(0);
    expect(run('')).toBe(0);
    expect(run(' ')).toBe(0);
    expect(run('+1')).toBe(0);
    expect(run('Infinity')).toBe(0);
    expect(run(Infinity)).toBe(0);
    expect(run(NaN)).toBe(0);
    // Well-formed JSON numbers whose value is out of the finite domain:
    // matching the grammar is not enough, since numberValue tests
    // Number.isFinite on the *coerced* value. Stopping at the grammar stores
    // Infinity in a node field, which then serializes back out as null.
    expect(run('1e999')).toBe(0);
    expect(run('-1e999')).toBe(0);
    expect(run('9'.repeat(400))).toBe(0);
  });

  test('enumValue', () => {
    expectAgrees(enumValue(['normal', 'token', 'segmented']));
    expectAgrees(enumValue([null, 'ltr', 'rtl']));
    expectAgrees(enumValue(['a', 'b'], 'b'));
  });

  test('an enum member spelled undefined is never matched', () => {
    // enumValue checks for undefined before membership, so an absent property
    // takes the default rather than the in-band member.
    const schema = enumValue([undefined, 'a'], 'a');
    expectAgrees(schema);
    expect(compiled(schema)(undefined)).toBe('a');
  });

  test('aliasedValue', () => {
    const aliases = {bold: 1, italic: 2};
    const schema = aliasedValue(numberValue(), aliases);
    expectAgrees(schema);
    const run = compiled(schema);
    expect(run('bold')).toBe(1);
    expect(run('italic')).toBe(2);
    expect(run(4)).toBe(4);
    expect(run('4')).toBe(4);
    expect(run('nope')).toBe(0);
  });

  test('an alias table cannot be reached through Object.prototype', () => {
    // The key comes straight out of untrusted JSON, so a plain object literal
    // would resolve 'toString' to a function and store it as the value.
    const run = compiled(aliasedValue(numberValue(), {bold: 1}));
    for (const hostile of [
      'toString',
      'constructor',
      'hasOwnProperty',
      'valueOf',
      '__proto__',
    ]) {
      expect(run(hostile)).toBe(0);
    }
  });
});

describe('compileParse refuses what it cannot express', () => {
  test.each([
    ['nullable', () => nullable(stringValue())],
    ['optional', () => optional(numberValue())],
    ['arrayValue', () => arrayValue(stringValue())],
    ['unionValue', () => unionValue([numberValue(), stringValue()])],
    ['rawValue', () => rawValue()],
    ['objectValue', () => objectValue({a: stringValue()})],
  ])('%s', (_label, build) => {
    const schema = build() as AnySerializationSchema;
    expect(() => compileParse(schema.meta, schema.defaultValue, 'T')).toThrow(
      NotCompilable,
    );
  });
});

describe('a constrained numberValue compiles to its bounds', () => {
  test.each([
    ['a minimum', () => numberValue(0, {min: 1})],
    ['a maximum', () => numberValue(0, {max: 10})],
    ['integers only', () => numberValue(0, {integer: true})],
    ['all three', () => numberValue(2, {integer: true, max: 8, min: 1})],
    // The bound an absent option stands for is ±Infinity, which JSON.stringify
    // renders as `null` — so it is emitted as source, not through `literal`.
    ['no bounds at all', () => numberValue(3)],
  ])('%s', (_label, build) => {
    const schema = build() as AnySerializationSchema;
    const {expression, tables} = compileParse(
      schema.meta,
      schema.defaultValue,
      'T',
    );
    // The verification runs the emitted expression against the schema over the
    // corpus, so this is what proves the bounds were reproduced rather than
    // merely emitted.
    expect(() =>
      verifyCompiledParse({expression, schema, tables}),
    ).not.toThrow();
  });
});

describe('verifyCompiledParse is what catches a plausible-but-wrong parse', () => {
  test('a transformValue compiles to something the check rejects', () => {
    // The reason the verification exists: transformValue inherits its inner
    // schema's meta and keeps the function to itself, so nothing about the meta
    // reveals that the compiled expression stores the un-transformed value.
    const schema = transformValue(
      enumValue(['a', 'b']),
      value => (value === 'a' ? 1 : 2) as unknown,
    ) as AnySerializationSchema;
    const {expression, tables} = compileParse(
      schema.meta,
      schema.defaultValue,
      'T',
    );
    // It compiles happily — and to something that returns the *input* 'a'
    // where the schema returns the transformed 1.
    expect(expression).toContain('v === "a"');
    // Only running it against the schema shows that.
    expect(() => verifyCompiledParse({expression, schema, tables})).toThrow(
      NotCompilable,
    );
    expect(() => verifyCompiledParse({expression, schema, tables})).toThrow(
      /disagrees with its schema/,
    );
  });

  test('a faithful parse passes', () => {
    const schema = aliasedValue(numberValue(), {bold: 1});
    const {expression, tables} = compileParse(
      schema.meta,
      schema.defaultValue,
      'T',
    );
    expect(() =>
      verifyCompiledParse({
        expression,
        nullPrototypeTables: tables.map(({name}) => name),
        schema,
        tables,
      }),
    ).not.toThrow();
  });

  test('a table left with Object.prototype fails the check', () => {
    // Not declaring the table null-prototype is exactly the bug the hostile
    // keys in the corpus are there to find.
    const schema = aliasedValue(numberValue(), {bold: 1});
    const {expression, tables} = compileParse(
      schema.meta,
      schema.defaultValue,
      'T',
    );
    expect(() =>
      verifyCompiledParse({
        expression,
        nullPrototypeTables: [],
        schema,
        tables,
      }),
    ).toThrow(/disagrees with its schema on "toString"/);
  });
});

describe('verifyTableCoversDomain', () => {
  const mode = enumValue(['normal', 'token', 'segmented']);

  test('a total table passes', () => {
    expect(() =>
      verifyTableCoversDomain({
        schema: mode,
        table: {normal: 0, segmented: 2, token: 1},
      }),
    ).not.toThrow();
  });

  test('a missing member is named', () => {
    // Without this the generated lookup would fall back and store 'segmented'
    // as whatever the default encodes to, turning one value into another.
    expect(() =>
      verifyTableCoversDomain({schema: mode, table: {normal: 0, token: 1}}),
    ).toThrow(/no table entry for "segmented"/);
  });

  test('an inherited key does not count as coverage', () => {
    expect(() =>
      verifyTableCoversDomain({
        schema: enumValue(['toString']),
        table: {other: 1},
      }),
    ).toThrow(/no table entry for "toString"/);
  });

  test('a key the enum cannot produce is named', () => {
    // The other direction of the same drift: a member added to the table and
    // not to the enum is one import silently coerces to the default.
    expect(() =>
      verifyTableCoversDomain({
        schema: mode,
        table: {extra: 3, normal: 0, segmented: 2, token: 1},
      }),
    ).toThrow(/table entry for "extra" that its enum cannot produce/);
  });

  test('numeric members are compared as the property keys they become', () => {
    expect(() =>
      verifyTableCoversDomain({
        schema: enumValue([0, 1]),
        table: {0: 'a', 1: 'b'},
      }),
    ).not.toThrow();
  });
});

describe('compileDiffersFromDefault', () => {
  /** Compile and verify, the way the generator uses the two together. */
  function differs(schema: AnySerializationSchema): string {
    const expression = compileDiffersFromDefault(schema, 'value');
    verifyDiffersFromDefault({expression, name: 'value', schema});
    return expression;
  }

  test('a primitive default compares against its literal', () => {
    expect(differs(stringValue('fallback'))).toBe('value !== "fallback"');
    expect(differs(numberValue(7))).toBe('value !== 7');
    expect(differs(booleanValue(true))).toBe('value !== true');
    expect(differs(optional(numberValue()))).toBe('value !== undefined');
    expect(differs(nullable(stringValue()))).toBe('value !== null');
  });

  test('an empty array default becomes the length test its equality reduces to', () => {
    // arrayValue compares by content, so a fresh empty array *is* the default
    // even though no literal could be `===` to it.
    expect(differs(arrayValue(stringValue()))).toBe(
      '!(Array.isArray(value) && value.length === 0)',
    );
  });

  test.each([
    ['an object', () => objectValue({a: stringValue()})],
    ['a non-finite number', () => numberValue(Infinity)],
    [
      'a non-empty array',
      () => transformValue(arrayValue(numberValue()), () => [1] as number[]),
    ],
  ])('%s has no faithful comparison', (_label, build) => {
    const schema = build() as AnySerializationSchema;
    expect(() => compileDiffersFromDefault(schema, 'value')).toThrow(
      NotCompilable,
    );
  });

  test('a declared equality the literal does not reproduce is caught', () => {
    // The meta of a transformValue is its inner schema's, so this compiles to
    // `value !== 0` — and the schema itself says 1 is the default too.
    const schema = transformValue(numberValue(), value => value, {
      isEqual: (a, b) =>
        typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 2,
    }) as AnySerializationSchema;
    const expression = compileDiffersFromDefault(schema, 'value');
    expect(expression).toBe('value !== 0');
    expect(() =>
      verifyDiffersFromDefault({expression, name: 'value', schema}),
    ).toThrow(/disagrees with its schema on whether 1 is the default/);
  });

  test('a structural test for a default compared by identity is caught', () => {
    // An empty-array default without arrayValue's equality: the walk omits
    // only the very object it holds, so a length test would omit too much.
    // compileDiffersFromDefault refuses it outright, and the verification
    // would have refused the expression had it been emitted.
    const schema = transformValue(
      stringValue(),
      () => [] as string[],
    ) as AnySerializationSchema;
    expect(() => compileDiffersFromDefault(schema, 'value')).toThrow(
      NotCompilable,
    );
    expect(() =>
      verifyDiffersFromDefault({
        expression: '!(Array.isArray(value) && value.length === 0)',
        name: 'value',
        schema,
      }),
    ).toThrow(/disagrees with its schema on whether \[\] is the default/);
  });
});

describe('the emitted num helper', () => {
  test('is the one the verification ran', () => {
    // Emitting a second spelling of this logic is the drift the whole
    // verification exists to prevent, so the source is shared rather than
    // written twice.
    expect(NUM_HELPER_SOURCE).toContain('function num(v: unknown, d: number)');
    expect(NUM_HELPER_SOURCE).toContain('Number.isFinite(v) ? v : d');
    expect(NUM_HELPER_SOURCE).toContain('JSON_NUMBER.test(v)');
  });
});

describe('verificationCorpus', () => {
  test('covers the values a schema names and the shapes JSON arrives in', () => {
    const values = verificationCorpus(
      aliasedValue(numberValue(), {bold: 1}).meta,
    );
    // Both sides of every alias, so a table that maps the wrong way is caught.
    expect(values).toContain('bold');
    expect(values).toContain(1);
    // And the prototype members a lookup must not resolve.
    for (const hostile of ['toString', 'constructor', '__proto__', 'valueOf']) {
      expect(values).toContain(hostile);
    }
    expect(values).toContain(undefined);
  });

  test('is fixed, so a generator using it is reproducible', () => {
    const meta = enumValue(['a', 'b']).meta;
    expect(verificationCorpus(meta)).toEqual(verificationCorpus(meta));
  });
});
