/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, test} from 'vitest';

// @ts-expect-error - a .mjs script with JSDoc types, not a typed module
import {claimTableName, emittable} from '../../shared/generateNodeJSON.mjs';

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
