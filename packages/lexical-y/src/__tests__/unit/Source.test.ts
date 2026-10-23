/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import * as fs from 'node:fs';
import * as path from 'node:path';
import {expect, test} from 'vitest';

import * as mainEntry from '../..';

// Bundlers replace only process.env.NODE_ENV: any other process.env read in
// shipped source throws "process is not defined" in a browser.
test('shipped source reads no process.env but NODE_ENV', () => {
  const src = path.resolve(__dirname, '../..');
  const offenders: string[] = [];
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') {
          visit(p);
        }
      } else if (/\.tsx?$/.test(entry.name)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const m of text.matchAll(/process\.env\.(\w+)/g)) {
          if (m[1] !== 'NODE_ENV') {
            offenders.push(`${path.relative(src, p)}: process.env.${m[1]}`);
          }
        }
      }
    }
  };
  visit(src);
  expect(offenders).toEqual([]);
});

// Old clients (@lexical/yjs) write other roots, so servers need no API of
// their own: the package has no server entry, and the two constants a
// server may want come from the main entry.
test('public entries', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
  ) as {exports: Record<string, unknown>};
  expect(Object.keys(pkg.exports).sort()).toEqual(['.']);
  expect(mainEntry.DEFAULT_ROOT_NAME).toBe('lexical-y');
  expect(typeof mainEntry.LAYOUT_VERSION).toBe('number');
  expect(Object.keys(mainEntry).sort()).toEqual([
    'DEFAULT_ROOT_NAME',
    'LAYOUT_VERSION',
    'NESTED_FALLBACK_WARNING',
    'RECOVERED_READ_WARNING',
    'RECOVERED_WRITE_WARNING',
    'SELF_CHECK_WARNING',
    'STORAGE_MISMATCH_WARNING',
    'UNKNOWN_NODE_TYPES_WARNING',
    'UNSUPPORTED_CONFIG_WARNING',
    'UNSUPPORTED_LAYOUT_WARNING',
    'UNSUPPORTED_SLOTS_WARNING',
    'UNSYNCED_VALUE_WARNING',
    'YBinding',
    'YCollabExtension',
    'describeStorage',
  ]);
});
