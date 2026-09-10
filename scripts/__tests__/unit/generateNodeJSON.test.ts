/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  arrayValue,
  nodeSchema,
  numberValue,
  objectValue,
  optional,
  stringValue,
  TextNode,
  withField,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  claimTableName,
  emittable,
  generateCompactExport,
  generateUpdate,
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
    for (const name of ['json', 'node', 'prevNode', 'self', 'v', 'n']) {
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

describe('lookup table names', () => {
  test('the same table may be claimed again under its own name', () => {
    const table = {a: 1};
    claimTableName('TEXT_MODE_ENCODE', table);
    expect(() => claimTableName('TEXT_MODE_ENCODE', table)).not.toThrow();
  });

  test('two different tables cannot share a name', () => {
    // Names are derived by upper-casing, which is not injective: `textFormat`
    // and `textformat` produce the same one. Silently replacing the first
    // table would leave the first class decoding through the second's.
    claimTableName('COLLIDE_DECODE', {a: 1});
    expect(() => claimTableName('COLLIDE_DECODE', {b: 2})).toThrow(
      /two different lookup tables both want the name/,
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
    // The export half is unaffected: reading a property back out asks the
    // schema nothing about membership.
    expect(generateCompactExport(NarrowedNode)).toContain(
      'const tag = node.__tag;',
    );
  });
});
