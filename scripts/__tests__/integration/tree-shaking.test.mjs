/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
import {build} from 'esbuild';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

import {packagesManager} from '../../shared/packagesManager.mjs';

describe('built production tree shaking', () => {
  test('a createCommand-only consumer does not retain the editor', async () => {
    const lexical = packagesManager
      .getPublicPackages()
      .find(pkg => pkg.getNpmName() === 'lexical');
    if (lexical === undefined) {
      throw new Error('lexical package was not found');
    }
    const productionExport = lexical.packageJson.exports['.'].import.production;
    const productionFile = lexical.resolve(productionExport);

    // Vite's test aliases and the root tsconfig both resolve "lexical" to its
    // TypeScript source. Point just this import at the built production
    // export so the test measures the distributed artifact.
    const result = await build({
      absWorkingDir: process.cwd(),
      bundle: true,
      conditions: ['production'],
      format: 'esm',
      logLevel: 'silent',
      metafile: true,
      minify: true,
      platform: 'browser',
      plugins: [
        {
          name: 'production-lexical',
          setup(esbuildBuild) {
            esbuildBuild.onResolve({filter: /^lexical$/}, () => ({
              path: productionFile,
            }));
          },
        },
      ],
      stdin: {
        contents:
          "import {createCommand} from 'lexical'; export {createCommand};",
        resolveDir: process.cwd(),
        sourcefile: 'tree-shaking-consumer.js',
      },
      write: false,
    });

    // A small bundle from the wrong export (for example the source condition)
    // is not evidence that the built production artifact tree-shakes.
    expect(
      Object.keys(result.metafile.inputs).map(input => path.resolve(input)),
    ).toContain(path.resolve(productionFile));
    const output = result.outputFiles[0];
    expect(output.text).toContain('createCommand');
    expect(output.contents.byteLength).toBeLessThan(16 * 1024);
  });
});
