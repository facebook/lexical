/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {glob} from 'glob';
import * as fs from 'node:fs';
import {describe, expect, test} from 'vitest';

/**
 * The compact export omits every property equal to its schema default, so a
 * declaration returning the full serialized type for a compact call promises
 * properties the value does not carry. TypeScript overloads on `compact` to say
 * which shape came back; Flow cannot — its method-override check pairs no
 * branch, so every node from TextNode down would fail to extend — and the
 * declarations instead take `compact?: false`, which refuses a compact call
 * where it is written rather than answering it wrongly.
 *
 * That rule has to hold for *every* declaration, not just the base: a subclass
 * re-declaring `exportJSON` with `boolean` reinstates the promise for its own
 * type, which is where `node.exportJSON(true).text.length` type-checked from.
 * Seven declarations across three packages carry it, so this checks the shape
 * rather than trusting that each one was found.
 */
describe('a Flow exportJSON declaration refuses a compact call', () => {
  const files = glob.sync('packages/*/flow/*.js.flow', {
    ignore: ['**/*.flowtest.js.flow'],
    windowsPathsNoEscape: true,
  });

  test('every declaration takes `compact?: false`', () => {
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    let found = 0;
    for (const file of files) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      for (const [index, line] of lines.entries()) {
        const match = /^\s*exportJSON\(compact\??: ([^)]*)\)/.exec(line);
        if (match === null) {
          continue;
        }
        found++;
        if (match[1] !== 'false') {
          offenders.push(`${file}:${index + 1} takes ${match[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
    // A guard that finds nothing to check is not a guard.
    expect(found).toBeGreaterThan(1);
  });
});
