/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import copy from 'rollup-plugin-copy';

function parseImportMapImportEntries() {
  const m = /<script type="importmap">([\s\S]+?)<\/script>/g.exec(
    fs.readFileSync('./esm/index.html', 'utf8'),
  );
  if (!m) {
    throw new Error('Could not parse importmap from esm/index.html');
  }
  return Object.entries<string>(JSON.parse(m[1]).imports);
}

export default function viteCopyEsm() {
  return copy({
    hook: 'writeBundle',
    targets: [
      {dest: './build/esm/', src: './esm/*'},
      {dest: './build/', src: ['./*.png', './*.ico']},
      ...parseImportMapImportEntries().map(([mod, fn]) => ({
        dest: './build/esm/dist/',
        // The importmap points at each package's fork module (e.g.
        // `./dist/Lexical.mjs`), but that fork module only re-exports from a
        // sibling bundle (`./Lexical.dev.mjs` in a dev/CI build, `.prod.mjs`
        // in a production build). Copy every `.mjs` in the package's dist so
        // the fork module's relative import resolves instead of 404ing.
        src: path.join(
          `../${mod.replace(/^@/, '').replace(/\//g, '-')}`,
          path.dirname(fn),
          '*.mjs',
        ),
      })),
    ],
    verbose: true,
  });
}
