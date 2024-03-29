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

// Fork modules are only produced by the build script
export default function viteCopyEsm() {
  return copy({
    hook: 'writeBundle',
    targets: [
      {dest: './build/esm/', src: './esm/*'},
      {dest: './build/', src: ['./*.png', './*.ico']},
      ...parseImportMapImportEntries().map(([mod, fn]) => ({
        dest: './build/esm/dist/',
        src: path.join(
          `../${mod.replace(/^@/, '').replace(/\//g, '-')}`,
          // Fork modules are only produced by build-release, which is not run
          // in CI, so we don't need to worry about choosing dev or prod
          fn,
        ),
      })),
    ],
    verbose: true,
  });
}
