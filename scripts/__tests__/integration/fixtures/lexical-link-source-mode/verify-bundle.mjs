/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Confirm that vite consumed lexical via the `source` condition rather
// than the compiled `dist/` artifacts. The two builds produce visibly
// different output: the source build inlines makeEditor and the
// LexicalEditor class; the dist build pulls in a pre-bundled
// `Lexical.dev.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(fixtureDir, 'dist/main.mjs');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const assertions = [
  {
    description:
      'bundle includes class LexicalEditor (proves source was compiled, not the prebuilt artifact)',
    test: () => /class\s+LexicalEditor\b/.test(bundle),
  },
  {
    description: 'bundle exports makeEditor',
    test: () => /\bmakeEditor\b/.test(bundle),
  },
  {
    description:
      'bundle does not reference the prebuilt artifact (no `Lexical.dev` or `Lexical.prod` paths)',
    test: () => !/Lexical\.(dev|prod)\.m?js/.test(bundle),
  },
];

const linkedRoot = fs.realpathSync(
  path.join(fixtureDir, 'node_modules/lexical'),
);
const expectedRoot = fs.realpathSync(
  path.resolve(fixtureDir, '../../../../../packages/lexical'),
);
if (linkedRoot !== expectedRoot) {
  console.error(
    `FAIL: lexical resolved to ${linkedRoot}, expected ${expectedRoot}.\n` +
      "The fixture should be installed via pnpm's link: protocol against the monorepo.",
  );
  process.exit(1);
}

let failed = 0;
for (const {description, test} of assertions) {
  if (test()) {
    console.log(`ok - ${description}`);
  } else {
    console.error(`fail - ${description}`);
    failed += 1;
  }
}
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed. Bundle path: ${bundlePath}`);
  process.exit(1);
}
console.log(`\nBundle at ${bundlePath} verified (source-mode).`);
