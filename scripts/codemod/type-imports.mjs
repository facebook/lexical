/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Deterministically normalises type-only imports across the repo so the Babel 8
 * build (`@babel/preset-typescript`, `onlyRemoveTypeImports` default) can elide
 * them:
 *
 *   - A module imported ONLY for types uses `import type {X} from 'm'`, which is
 *     elided completely.
 *   - A module imported for BOTH values and types keeps its value import and
 *     marks the type specifiers inline: `import {v, type T} from 'm'` (or
 *     `import Default, {type T} from 'm'`). This avoids both a stray second
 *     `import type` statement and a sole-specifier `import {type T}` that Babel
 *     would leave behind as a runtime `import 'm'`.
 *
 * It is intentionally reproducible: if the "apply codemod" commit is dropped
 * during a rebase, re-run `pnpm run codemod-type-imports` on the rebased base to
 * regenerate it. The transform is idempotent (a second run is a no-op) and
 * never touches bare side-effect imports (e.g. `import 'prismjs'`).
 *
 * How it works:
 *   1. `@typescript-eslint/consistent-type-imports` with `inline-type-imports`
 *      marks every type-only specifier with `type` (this style handles default
 *      imports like `import React, {…}` correctly, where `separate-type-imports`
 *      emits invalid syntax).
 *   2. Two text passes: fold any pre-existing separate `import type {T}` +
 *      value import from the same module into one inline statement, then promote
 *      pure all-`type` inline imports (`import {type A, type B}`) up to
 *      `import type {A, B}` so they are elided.
 *   3. Sort + prettier.
 */

import {execFileSync} from 'node:child_process';
import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

// A throwaway flat-config that extends the repo's eslint config and turns on
// `consistent-type-imports` (scoped to TS files, so its plugin resolves) plus
// turns OFF the dedup/sort fixers for the marking pass. It is written next to
// the base config so the `import` below and the base config's own relative
// plugin imports resolve, then removed again. Enabling the rule here (rather
// than relying on the checked-in config) keeps the codemod self-contained: it
// regenerates the diff even against a commit that has not turned the rule on.
const MARK_CONFIG_PATH = path.join(root, '.eslint.codemod.mjs');
const MARK_CONFIG_SOURCE = `import base from './eslint.config.mjs';
export default [
  ...base,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {disallowTypeAnnotations: false, fixStyle: 'inline-type-imports'},
      ],
    },
  },
  {
    rules: {
      'import-x/no-duplicates': 'off',
      'simple-import-sort/exports': 'off',
      'simple-import-sort/imports': 'off',
    },
  },
];
`;

/** @param {string[]} extraArgs */
function eslintFix(extraArgs) {
  execFileSync(
    'npx',
    ['eslint', '--no-warn-ignored', '--fix', ...extraArgs, '.'],
    {cwd: root, stdio: ['ignore', 'ignore', 'inherit']},
  );
}

function trackedTypeScriptFiles() {
  return execFileSync('git', ['ls-files', '*.ts', '*.tsx', '*.mts'], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

/** @param {string} s */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} specs */
function splitSpecs(specs) {
  return specs
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// (1) Fold a pre-existing separate `import type {T} from 'm'` into a sibling
// value import (`import {v} …` or `import D, {v} …`) from the same module, as
// `import {v, type T} …`. Namespace/default-only imports have no braces to fold
// into and are left alone. (2) Promote pure all-`type` inline imports up to
// `import type {…}`. Returns the number of statements rewritten.
/** @param {string} file */
function normalizeImports(file) {
  const abs = path.join(root, file);
  let text = readFileSync(abs, 'utf8');
  let changed = 0;

  // (1) fold separate `import type {…}` into a value import from the same module
  const typeModules = new Set();
  for (const m of text.matchAll(/^import type \{[^}]*\} from '([^']+)';$/gm)) {
    typeModules.add(m[1]);
  }
  for (const mod of typeModules) {
    const m = esc(mod);
    const typeRe = new RegExp(
      `^import type \\{([^}]*)\\} from '${m}';\\n`,
      'm',
    );
    // Value import with braces, optionally with a leading default binding.
    const valRe = new RegExp(
      `^import (?<lead>[A-Za-z0-9_$]+, )?\\{(?<specs>[^}]*)\\} from '${m}';`,
      'm',
    );
    const typeMatch = text.match(typeRe);
    const valMatch = text.match(valRe);
    if (!typeMatch || !valMatch) {
      continue;
    }
    const groups = valMatch.groups ?? {};
    const typeSpecs = splitSpecs(typeMatch[1]).map(s =>
      s.startsWith('type ') ? s : `type ${s}`,
    );
    const valSpecs = splitSpecs(groups.specs ?? '');
    const lead = groups.lead ?? '';
    text = text.replace(
      valRe,
      `import ${lead}{${[...valSpecs, ...typeSpecs].join(', ')}} from '${mod}';`,
    );
    text = text.replace(typeRe, '');
    changed += 1;
  }

  // (2) promote pure all-`type` inline imports to `import type {…}`
  text = text.replace(
    /^import \{([^}]*)\} from '([^']+)';/gm,
    (full, specs, mod) => {
      const parts = splitSpecs(specs);
      if (parts.length > 0 && parts.every(p => p.startsWith('type '))) {
        changed += 1;
        return `import type {${parts
          .map(p => p.slice('type '.length))
          .join(', ')}} from '${mod}';`;
      }
      return full;
    },
  );

  if (changed > 0) {
    writeFileSync(abs, text);
  }
  return changed;
}

console.log(
  '[type-imports] 1/3 marking type-only imports (consistent-type-imports)…',
);
writeFileSync(MARK_CONFIG_PATH, MARK_CONFIG_SOURCE);
try {
  eslintFix(['--config', MARK_CONFIG_PATH]);
} finally {
  rmSync(MARK_CONFIG_PATH, {force: true});
}

console.log('[type-imports] 2/3 folding + promoting type imports…');
let totalChanged = 0;
const touched = [];
for (const file of trackedTypeScriptFiles()) {
  const n = normalizeImports(file);
  if (n > 0) {
    totalChanged += n;
    touched.push(file);
  }
}
console.log(
  `[type-imports]     rewrote ${totalChanged} statement(s) across ${touched.length} file(s)`,
);

console.log('[type-imports] 3/3 sorting imports + formatting…');
eslintFix([]);
execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', '.'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
});

console.log('[type-imports] done.');
