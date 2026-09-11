/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {describe, expect, it} from 'vitest';

import {packagesManager} from '../../shared/packagesManager.mjs';

const require = createRequire(import.meta.url);

describe('published extension subpaths', () => {
  it.each(['development', 'production'])(
    'a rich-text editor excludes the barrel without tree-shaking (%s)',
    async condition => {
      const entries = new Map(
        packagesManager
          .getPublicPackages()
          .flatMap(pkg =>
            pkg
              .getNormalizedNpmModuleExportEntries()
              .map(([name, exports]) => [
                name,
                pkg.resolve(
                  condition === 'production'
                    ? exports.production
                    : exports.development,
                ),
              ]),
          ),
      );
      const result = await build({
        bundle: true,
        conditions: [condition],
        define: {'process.env.NODE_ENV': JSON.stringify(condition)},
        format: 'esm',
        logLevel: 'silent',
        metafile: true,
        platform: 'browser',
        plugins: [
          {
            name: 'published-package-entries',
            setup(builder) {
              builder.onResolve(
                {filter: /^(lexical|@lexical\/)/},
                ({path: name}) => {
                  const file = entries.get(name);
                  return file ? {path: file} : null;
                },
              );
            },
          },
        ],
        stdin: {
          contents: `
            import {buildEditorFromExtensions} from '@lexical/extension/LexicalBuilder';
            import {RichTextExtension} from '@lexical/rich-text';
            export const editor = buildEditorFromExtensions(RichTextExtension);
          `,
          resolveDir: process.cwd(),
        },
        treeShaking: false,
        tsconfigRaw: {},
        write: false,
      });
      const files = Object.keys(result.metafile.inputs);
      expect(
        files.some(file => /LexicalExtensionLexicalBuilder\./.test(file)),
      ).toBe(true);
      expect(
        files.filter(file =>
          /LexicalExtension(?:AutoFocusExtension|HMRExtension)?\.(?:dev|prod)\.js$/.test(
            file,
          ),
        ),
      ).toEqual([]);
      expect(
        files.filter(file =>
          /LexicalExtensionSignals\.(?:dev|prod)\.js$/.test(file),
        ),
      ).toHaveLength(1);
    },
  );

  it('keeps barrel exports identical to their owning subpath values', () => {
    const pkg = packagesManager.getPackageByNpmName('@lexical/extension');
    const barrel = require('@lexical/extension');
    const values = Object.assign({}, require('lexical'));
    for (const {name} of pkg.getExportedNpmModuleEntries()) {
      if (name !== '@lexical/extension') Object.assign(values, require(name));
    }
    for (const [name, value] of Object.entries(barrel)) {
      expect(value, name).toBe(values[name]);
    }
    expect(Object.keys(barrel)).toContain('HorizontalRuleNode');
    expect(Object.keys(barrel)).toContain('signal');
  });
});
