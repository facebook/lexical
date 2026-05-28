/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Confirm that vite consumed every linked package via the `source` condition
// rather than the compiled `dist/` artifacts. The fixture imports `lexical`,
// `@lexical/rich-text` and `@lexical/extension` (which transitively pull in
// @lexical/clipboard, @lexical/selection, @lexical/utils and @lexical/internal),
// so a green run proves cross-package source resolution links everything
// against everything else. A source build inlines each package's TypeScript
// (e.g. the LexicalEditor class); a dist build would instead pull in a
// pre-bundled `Lexical*.dev.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = path.join(fixtureDir, 'dist/main.mjs');
const bundle = fs.readFileSync(bundlePath, 'utf8');

const assertions = [
  {
    description:
      'bundle includes class LexicalEditor (proves lexical source was compiled, not the prebuilt artifact)',
    test: () => /class\s+LexicalEditor\b/.test(bundle),
  },
  {
    description: 'bundle exports makeEditor',
    test: () => /\bmakeEditor\b/.test(bundle),
  },
  {
    description:
      'bundle includes registerRichText (proves @lexical/rich-text was bundled)',
    test: () => /\bregisterRichText\b/.test(bundle),
  },
  {
    description:
      'bundle includes buildEditorFromExtensions (proves @lexical/extension was bundled)',
    test: () => /\bbuildEditorFromExtensions\b/.test(bundle),
  },
  {
    description:
      'bundle does not reference any prebuilt artifact (no `Lexical*.{dev,prod,node}.{js,mjs}` paths)',
    test: () => !/Lexical[A-Za-z]*\.(dev|prod|node)\.m?js/.test(bundle),
  },
];

// Each directly-linked package must resolve to its monorepo source directory
// (the `link:` symlink), not a registry copy.
const linkedPackages = [
  ['lexical', 'packages/lexical'],
  ['@lexical/rich-text', 'packages/lexical-rich-text'],
  ['@lexical/extension', 'packages/lexical-extension'],
];
const monorepoRoot = path.resolve(fixtureDir, '../../../../..');
for (const [name, relPath] of linkedPackages) {
  const linkedRoot = fs.realpathSync(
    path.join(fixtureDir, 'node_modules', name),
  );
  const expectedRoot = fs.realpathSync(path.join(monorepoRoot, relPath));
  if (linkedRoot !== expectedRoot) {
    console.error(
      `FAIL: ${name} resolved to ${linkedRoot}, expected ${expectedRoot}.\n` +
        "The fixture should be installed via pnpm's link: protocol against the monorepo.",
    );
    process.exit(1);
  }
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
