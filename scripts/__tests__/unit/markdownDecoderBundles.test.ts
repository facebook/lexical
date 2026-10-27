/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {build} from 'esbuild';
import path from 'node:path';
import {describe, expect, it} from 'vitest';

describe('Markdown decoder module boundaries', () => {
  it.each([
    ['@lexical/markdown', false],
    ['@lexical/markdown/SSRMarkdownExtension', true],
  ] as const)(
    'includes the entity table only through %s when requested: %s',
    async (entry, fullTable) => {
      const result = await build({
        bundle: true,
        conditions: ['source'],
        external: ['lexical'],
        format: 'esm',
        metafile: true,
        platform: 'browser',
        plugins: [
          {
            name: 'external-lexical-siblings',
            setup(builder) {
              builder.onResolve({filter: /^@lexical\//}, args =>
                args.path === '@lexical/markdown' ||
                args.path.startsWith('@lexical/markdown/')
                  ? null
                  : {external: true, path: args.path},
              );
            },
          },
        ],
        stdin: {
          contents: `export * from '${entry}';`,
          resolveDir: path.resolve('packages/lexical-markdown'),
        },
        tsconfigRaw: {compilerOptions: {}},
        write: false,
      });
      const inputs = Object.keys(result.metafile.inputs);
      expect(inputs.some(input => input.includes('/character-entities/'))).toBe(
        fullTable,
      );
      expect(
        inputs.some(input => input.endsWith('/SSRMarkdownExtension.ts')),
      ).toBe(fullTable);
      expect(
        inputs.filter(input =>
          input.endsWith('/lexical-markdown/src/MarkdownExtension.ts'),
        ),
      ).toHaveLength(1);
    },
  );
});
