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
  TextNode,
  withField,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  claimTableName,
  emittable,
  generateCompactExport,
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
 * A class keeps the compact form or falls back to the walk for it, and either
 * way the checked-in output is valid — the fallback is silent by design. So
 * these drive the generator over classes the manifest does not contain, which
 * is the only way a property that should not have cost its class this form,
 * and one that should, can be told apart.
 */
describe('what costs a class its compact export', () => {
  test('not a default of undefined, whatever equality the schema carries', () => {
    // `optional` lifts its inner schema's `isEqual`, so this property has one
    // while its default is `undefined` — and a default of `undefined` has no
    // literal to compare against, which is what `differsFromDefault` refuses.
    // The walk skips an undefined value before it ever looks at the default,
    // and so does the generated form: rendering the comparison first threw
    // that refusal over a string the test was about to discard, and took the
    // class out of the compact form for a property that needs no comparison.
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
    const source: null | string = generateCompactExport(OptionalTags);
    expect(source).not.toBeNull();
    expect(source).toContain('const tags = node.__tags;');
    // The whole test, with nothing else and'd onto it.
    expect(source).toContain('if (tags !== undefined) {');
    // While a sibling that does have a default still compares against it.
    expect(source).toContain('if (style !== undefined && style !== "") {');
  });

  test('but a default with no literal to compare against still does', () => {
    // An object default — here the one `objectValue` composes from its fields'
    // — is a default `differsFromDefault` cannot state. There *is* a default,
    // so the comparison is reached, and the class falls back to the walk for
    // this form. That is the refusal the reordering has to leave intact.
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
    expect(generateCompactExport(ObjectDefault)).toBeNull();
  });
});
