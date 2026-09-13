/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  NUM_HELPER_SOURCE,
  NUM_RANGE_HELPER_SOURCE,
} from '@lexical/compiler/SchemaJsonCodegen';
import {transformSync} from 'esbuild';
import {
  aliasedValue,
  aliasTableOf,
  arrayValue,
  createEditor,
  decodeTableOf,
  encodedDefaultOf,
  encodeTableOf,
  getComposedSchemaFields,
  LineBreakNode,
  nodeSchema,
  numberValue,
  objectValue,
  optional,
  stringValue,
  TextNode,
  withField,
} from 'lexical';
import ts from 'typescript';
import {describe, expect, test} from 'vitest';

import {
  declareTable,
  emittable,
  generateCompactExport,
  generateUpdate,
  resetTableLocals,
  tableDeclaration,
  tableDeclarations,
  // @ts-expect-error - a .mjs script with JSDoc types, not a typed module
} from '../../shared/generateNodeJSON.mjs';

/**
 * The generator interpolates schema keys, field names, accessor names and
 * predicate names straight into the JavaScript it writes. Every name in the
 * checked-in manifest is an ordinary identifier, so these refusals have no
 * other way to be exercised — and the failure they replace is either a syntax
 * error reported against generated code rather than against the schema that
 * caused it, or, for the names that do parse, code that reads something other
 * than what was declared.
 */
describe('names interpolated into generated code', () => {
  test('a plain identifier is returned unchanged', () => {
    expect(emittable('textFormat', 'schema key')).toBe('textFormat');
    expect(emittable('__style', 'getter field')).toBe('__style');
    expect(emittable('$weird', 'schema key', true)).toBe('$weird');
  });

  test('anything that is not an identifier is refused', () => {
    for (const name of ['data-foo', '2fast', 'a b', '', 'a.b', 'ids[]']) {
      expect(() => emittable(name, 'schema key')).toThrow(
        /is not a plain identifier/,
      );
    }
  });

  test('a reserved word is refused only where a local is bound', () => {
    // `node.class` is legal to read; `const class = ...` is not.
    expect(emittable('class', 'getter method')).toBe('class');
    expect(() => emittable('class', 'schema key', true)).toThrow(
      /collides with a name the generated code binds/,
    );
  });

  test('a name the emitted code binds itself is refused', () => {
    // `const node = node.__node` would shadow the parameter it reads from.
    for (const name of [
      'json',
      'n',
      'node',
      'num',
      'numC',
      'prevNode',
      'self',
      'v',
    ]) {
      expect(() => emittable(name, 'schema key', true)).toThrow(
        /collides with a name the generated code binds/,
      );
    }
  });

  test('so is a name a sibling schema key already binds', () => {
    // The compact exporter binds `const <key>` for every property and
    // `hoistGatedReads` binds `const <predicate>` in the same scope, so a
    // `when` predicate sharing a sibling's name emitted two `const`s and a
    // generated module that does not parse — a `SyntaxError` reported against
    // generated code rather than against the schema that caused it.
    expect(
      emittable('shown', 'when predicate', true, new Set(['visible'])),
    ).toBe('shown');
    expect(() =>
      emittable('shown', 'when predicate', true, new Set(['shown', 'visible'])),
    ).toThrow(/collides with a name the generated code binds/);
    // Only where the name is bound, as with the reserved words.
    expect(emittable('shown', 'getter method', false, new Set(['shown']))).toBe(
      'shown',
    );
  });
});

describe('lookup table locals', () => {
  test('the same declaration may be bound again under its own name', () => {
    const declaration = tableDeclaration('encode', 'mode', {a: 1});
    declareTable('TEXT_MODE_ENCODE', declaration);
    expect(() => declareTable('TEXT_MODE_ENCODE', declaration)).not.toThrow();
  });

  test('two different tables cannot share a name', () => {
    // Names are derived by upper-casing, which is not injective: `textFormat`
    // and `textformat` produce the same one. Silently replacing the first
    // binding would leave one property decoding through the other's table.
    declareTable('COLLIDE_DECODE', tableDeclaration('decode', 'a', {a: 1}));
    expect(() =>
      declareTable('COLLIDE_DECODE', tableDeclaration('decode', 'b', {b: 2})),
    ).toThrow(/two different lookup tables both want the name/);
  });
});

/**
 * A generated module binds each table it reads to a local of the class's
 * factory, read off the composed schema the factory is handed, so the only
 * thing it states about a table is its type. No manifest class has a table
 * whose values need every spelling below, so they are driven through
 * `tableDeclaration`.
 */
describe('a lookup table declaration', () => {
  test('reads the table off the schema and states its type', () => {
    expect(tableDeclaration('decode', 'mode', {0: 'normal', 1: 'token'})).toBe(
      'decodeTableOf(fields, "mode") as {readonly [key: string]: "normal" | "token"}',
    );
    expect(tableDeclaration('encode', 'mode', {normal: 0, token: 1})).toBe(
      'encodeTableOf(fields, "mode") as {readonly [key: string]: 0 | 1}',
    );
    expect(tableDeclaration('alias', 'format', {bold: 1}, 0)).toBe(
      'aliasTableOf(fields, "format", 0) as {readonly [key: string]: 1}',
    );
  });

  test('spells an undefined value as the type undefined', () => {
    // A decode table may map a stored value to `undefined`: that is how a
    // stored value whose serialized form is the omitted default is spelled.
    // `JSON.stringify` has no spelling for it, and once left a type ending in
    // ` | `; the value itself is the schema's to hold now.
    expect(
      tableDeclaration('decode', 'mode', {0: undefined, 1: 'special'}),
    ).toBe(
      'decodeTableOf(fields, "mode") as {readonly [key: string]: "special" | undefined}',
    );
  });

  test('keeps the literal union however many values there are', () => {
    // An encode table's value is assigned to the field, and a field is often
    // narrower than its primitive: nine modes stored as `0 | 1 | ... | 8`.
    // Widening the table to `number` past a readable size made the generated
    // parser fail to compile for a node whose schema type-checks.
    const table: {[key: string]: unknown} = {};
    for (let i = 0; i < 9; i++) {
      table[`mode${i}`] = i;
    }
    expect(tableDeclaration('encode', 'mode', table)).toContain(
      '{readonly [key: string]: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}',
    );
  });

  test('a number JSON cannot spell is the type number', () => {
    // `encode: {unlimited: Infinity}` serializes the string and stores the
    // sentinel. Written through `JSON.stringify` the module once held `null`
    // where the walk stored `Infinity`; nothing about the value is written
    // now, and `Infinity` is no literal type, so the type widens to `number`
    // beside the finite literals. `-0` is the type `0`.
    expect(
      tableDeclaration('encode', 'limit', {
        minus: -Infinity,
        nan: NaN,
        one: 1,
        unlimited: Infinity,
        zero: -0,
      }),
    ).toContain('{readonly [key: string]: 0 | 1 | number}');
  });

  test('an empty alias table is declared as mapping to never', () => {
    // `aliasedValue(numberValue(), {})` is a valid schema — an alias table
    // with nothing in it — and registers and imports correctly. Its type is
    // the union of its values, which is empty, and an empty union spelled as
    // nothing left `{readonly [key: string]: }` in the module: no type at all.
    expect(tableDeclaration('alias', 'value', {}, 0)).toBe(
      'aliasTableOf(fields, "value", 0) as {readonly [key: string]: never}',
    );
    class ValueNode extends LineBreakNode {
      __value = 0;
      $config() {
        return this.config('generate-empty-alias', {
          extends: LineBreakNode,
          json: nodeSchema<ValueNode>()({
            value: withField(aliasedValue(numberValue(), {}), {
              field: '__value',
            }),
          }),
        });
      }
    }
    resetTableLocals();
    const source: string = generateUpdate(ValueNode);
    // What the module would hold for this class, checked as TypeScript
    // rather than read: an empty type is a syntax error the type checker
    // reports against generated code.
    const module = [
      NUM_HELPER_SOURCE,
      ...tableDeclarations().map(
        ([name, declaration]: [string, string]) =>
          `const ${name} = ${declaration};`,
      ),
      source,
    ].join('\n');
    const {diagnostics} = ts.transpileModule(module, {
      reportDiagnostics: true,
    });
    expect(
      (diagnostics || []).map(d =>
        ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      ),
    ).toEqual([]);
  });

  test('a parser falls back to the encoded default for a value the table misses', () => {
    // `verifyTableCoversDomain` proves an enum's table total, but a bounded
    // numeric domain it samples: `2` is in this one and need not be in the
    // corpus, and the table does not map it. The walk stores the encoded
    // default for such a miss, so the generated parser must too — read off
    // the schema when the code is attached, like the table itself, not
    // written into the module. Read bare, it stored `undefined`.
    // A LineBreakNode subclass: the base declares no property of its own, so
    // the composed schema — and the factory body assembled below — is this
    // one property and nothing else.
    class LimitNode extends LineBreakNode {
      __limit = 0;
      $config() {
        return this.config('generate-limit-miss', {
          extends: LineBreakNode,
          json: nodeSchema<LimitNode>()({
            limit: withField(numberValue(0, {integer: true, max: 2, min: 0}), {
              decode: {0: 0, 1: 1},
              encode: {0: 0, 1: 1},
              field: '__limit',
            }),
          }),
        });
      }
    }
    // As `generatePackage` does before each class: the forms bind their
    // tables into one registry, and the tests above have bound some already.
    resetTableLocals();
    const source: string = generateUpdate(LimitNode);
    // The factory's locals, the parser, and the parser handed back: what the
    // emitted module does, assembled for one class and run here against the
    // real helpers and the class's real composed schema.
    const module = [
      // The module-scope helpers a bounded numeric domain parses through.
      NUM_HELPER_SOURCE,
      NUM_RANGE_HELPER_SOURCE,
      ...tableDeclarations().map(
        ([name, declaration]: [string, string]) =>
          `const ${name} = ${declaration};`,
      ),
      source,
      'return updateLimitNode;',
    ].join('\n');
    const {code} = transformSync(module, {loader: 'ts'});
    const fields = new Map(Object.entries(getComposedSchemaFields(LimitNode)));
    // The assembled module is source, and running it is the point.
    // eslint-disable-next-line no-new-func
    const update = new Function(
      'fields',
      'aliasTableOf',
      'decodeTableOf',
      'encodeTableOf',
      'encodedDefaultOf',
      code,
    )(fields, aliasTableOf, decodeTableOf, encodeTableOf, encodedDefaultOf) as (
      node: LimitNode,
      json: {readonly [key: string]: unknown},
    ) => LimitNode;
    const editor = createEditor({
      namespace: '',
      nodes: [LimitNode],
      onError: err => {
        throw err;
      },
    });
    editor.update(
      () => {
        const node = new LimitNode();
        update(node, {limit: 2});
        expect(node.__limit).toBe(0);
        update(node, {limit: 1});
        expect(node.__limit).toBe(1);
      },
      {discrete: true},
    );
    expect(source).toContain(
      '(v as string) in LIMIT_LIMIT_ENCODE ? LIMIT_LIMIT_ENCODE[v as string] : LIMIT_LIMIT_ENCODE_DEFAULT',
    );
  });
});

/**
 * The compact form omits a property whose value parsing would restore, and the
 * generator states that comparison as source where the default has a literal a
 * value could be `===`. What it does where the default has none is invisible in
 * the checked-in output — no manifest class has such a property — so these
 * drive the generator over classes it does not contain.
 */
describe('a property the compact form cannot compare as source', () => {
  test('a default of undefined needs no comparison at all', () => {
    // `optional` lifts its inner schema's `isEqual`, so this property has one
    // while its default is `undefined` — and comparing against `undefined`
    // with an equality of its own is one of `differsFromDefault`'s refusals.
    // The walk skips an undefined value before it ever looks at the default,
    // and so does the generated form, so for this property the refusal is
    // moot: rendering the comparison first threw it over a string the test
    // was about to discard.
    class OptionalTags extends TextNode {
      __tags: undefined | number[] = undefined;
      $config() {
        return this.config('generate-optional-tags', {
          extends: TextNode,
          json: nodeSchema<OptionalTags>()({
            tags: withField(optional(arrayValue(numberValue())), {
              field: '__tags',
            }),
          }),
        });
      }
    }
    const source: string = generateCompactExport(OptionalTags);
    expect(source).toContain('const tags = node.__tags;');
    // The whole test, with nothing else and'd onto it.
    expect(source).toContain('if (tags !== undefined) {');
    // While a sibling that does have a default still compares against it.
    expect(source).toContain('if (style !== undefined && style !== "") {');
  });

  test('asks the schema at run time, and costs its siblings nothing', () => {
    // An object default — here the one `objectValue` composes from its fields'
    // — genuinely has no literal a value could be `===`, so the comparison
    // cannot be written down and the schema answers when the node is exported
    // instead. It used to take the whole class out of this form, which cost
    // `text`, `style` and the rest their generated code over one property they
    // have nothing to do with.
    class ObjectDefault extends TextNode {
      __box: {w: number} = {w: 0};
      $config() {
        return this.config('generate-object-default', {
          extends: TextNode,
          json: nodeSchema<ObjectDefault>()({
            box: withField(objectValue({w: numberValue()}), {field: '__box'}),
          }),
        });
      }
    }
    const source: string = generateCompactExport(ObjectDefault);
    expect(source).toContain('const box = node.__box;');
    expect(source).toContain(
      'if (box !== undefined && !isCompactDefault("box", box)) {',
    );
    // Which is what the parameter is declared for, and only then.
    expect(source).toContain('isCompactDefault: CompactDefaultTest,');
    // The siblings keep the comparisons they always had, as source.
    expect(source).toContain('if (style !== undefined && style !== "") {');
    expect(source).toContain('if (text !== undefined && text !== "") {');
  });
});

/**
 * The compiler reads a property's `meta` and nothing else, so a schema whose
 * author installed a membership predicate of its own describes a domain the
 * compiler cannot see. `verifyCompiledParse` samples a fixed corpus, so it
 * passes whenever the narrowing rejects nothing that corpus happens to hold —
 * which is why this is refused rather than left to the verifier.
 */
describe('a property whose schema narrows its own domain', () => {
  test('takes its class out of the import half rather than compiling', () => {
    const accepts = (value: unknown) =>
      typeof value === 'string' && !String(value).startsWith('#');
    const base = stringValue();
    const narrowed = Object.assign(
      (value: unknown) => (accepts(value) ? String(value) : base.defaultValue),
      base,
      {accepts},
    ) as never;
    class NarrowedNode extends TextNode {
      __tag: string = '';
      $config() {
        return this.config('generate-narrowed-tag', {
          extends: TextNode,
          json: nodeSchema<NarrowedNode>()({
            tag: withField(narrowed, {field: '__tag'}),
          }),
        });
      }
    }
    expect(generateUpdate(NarrowedNode)).toBeNull();
    // And wherever it sits in the schema, not only at the top. `aliasedValue`
    // derives its own predicate, so asking the outermost schema alone let this
    // through and compiled the inner *combinator's* parse — which keeps a
    // `#`-prefixed string the schema itself replaces with its default.
    class AliasedNarrowedNode extends TextNode {
      __tag: string = '';
      $config() {
        return this.config('generate-aliased-narrowed-tag', {
          extends: TextNode,
          json: nodeSchema<AliasedNarrowedNode>()({
            tag: withField(aliasedValue(narrowed, {legacy: 'modern'}), {
              field: '__tag',
            }),
          }),
        });
      }
    }
    expect(generateUpdate(AliasedNarrowedNode)).toBeNull();
    // The export half is unaffected: reading a property back out asks the
    // schema nothing about membership.
    expect(generateCompactExport(NarrowedNode)).toContain(
      'const tag = node.__tag;',
    );
  });
});
