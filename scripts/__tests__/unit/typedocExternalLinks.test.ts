/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Application} from 'typedoc';
import {expect, onTestFinished, test} from 'vitest';

import {
  externalSymbolLinkMappings,
  load,
} from '../../../packages/lexical-website/src/plugins/lexical-typedoc-plugin-external-links/index.mjs';

const websiteRequire = createRequire(
  path.resolve('packages/lexical-website/package.json'),
);

test.each(['flat', 'pnpm'])(
  'links external types and sources with a %s install',
  async layout => {
    const directory = mkdtempSync(path.join(tmpdir(), 'lexical-typedoc-'));
    onTestFinished(() => rmSync(directory, {force: true, recursive: true}));
    const packageDirectory = path.join(
      directory,
      'node_modules',
      ...(layout === 'pnpm'
        ? ['.pnpm', '@fixture+types@1.2.3', 'node_modules']
        : []),
      '@fixture/types',
    );
    mkdirSync(packageDirectory, {recursive: true});
    if (layout === 'pnpm') {
      mkdirSync(path.join(directory, 'node_modules/@fixture'));
      symlinkSync(
        packageDirectory,
        path.join(directory, 'node_modules/@fixture/types'),
        'junction',
      );
    }
    writeFileSync(
      path.join(packageDirectory, 'package.json'),
      JSON.stringify({
        name: '@fixture/types',
        types: 'index.d.ts',
        version: '1.2.3',
      }),
    );
    writeFileSync(
      path.join(packageDirectory, 'index.d.ts'),
      [
        'export interface Node { value: string; }',
        'export interface Documented { value: string; }',
        'export declare class Box { constructor(value: string); get(): string; }',
      ].join('\n'),
    );
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({name: 'fixture', private: true}),
    );
    writeFileSync(
      path.join(directory, 'index.ts'),
      [
        "import type {Node, Documented} from '@fixture/types';",
        "export {Box} from '@fixture/types';",
        '/** Links to {@link Node}, {@link Documented}, and {@link Local}. */',
        'export interface Local {',
        '  node: Node;',
        '  documented: Documented;',
        '  element: HTMLElement;',
        '  optional: Partial<Local>;',
        '}',
      ].join('\n'),
    );
    const tsconfig = path.join(directory, 'tsconfig.json');
    writeFileSync(
      tsconfig,
      JSON.stringify({
        compilerOptions: {
          lib: ['esnext', 'dom'],
          skipLibCheck: true,
          strict: true,
          types: [],
        },
        files: ['index.ts'],
      }),
    );
    const app = await Application.bootstrapWithPlugins({
      disableGit: true,
      entryPoints: [path.join(directory, 'index.ts')],
      externalSymbolLinkMappings: {
        ...externalSymbolLinkMappings,
        '@fixture/types': {Documented: 'https://example.com/documented'},
      },
      logLevel: 'Error',
      plugin: [websiteRequire.resolve('typedoc-plugin-markdown'), load],
      readme: 'none',
      router: 'module',
      sourceLinkTemplate:
        'https://github.com/facebook/lexical/blob/main/{path}#L{line}',
      tsconfig,
    });
    const project = await app.convert();
    expect(project).toBeDefined();
    const output = path.join(directory, 'docs');
    app.options.setValue('out', output);
    await app.generateOutputs(project!);
    const markdown = readFileSync(path.join(output, 'README.md'), 'utf8');
    expect(markdown).toContain(
      'https://developer.mozilla.org/docs/Web/API/HTMLElement',
    );
    expect(markdown).toContain(
      'https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype',
    );
    // An external Node must not be confused with the DOM Node of the same name.
    expect(markdown).toContain(
      'https://unpkg.com/browse/@fixture/types@1.2.3/index.d.ts',
    );
    expect(markdown).toContain('https://example.com/documented');
    expect(markdown).not.toContain('node_modules');
    // UNPKG does not provide line anchors for large declaration files.
    expect(markdown).not.toMatch(/https:\/\/unpkg\.com\/[^)\s]*#/);
    expect(markdown).toContain(
      '[index.ts:4](https://github.com/facebook/lexical/blob/main/index.ts#L4)',
    );
    expect(markdown).toContain(
      '[@fixture/types/index.d.ts:3](https://unpkg.com/browse/@fixture/types@1.2.3/index.d.ts)',
    );
    expect(markdown).toContain(
      'Links to [Node](https://unpkg.com/browse/@fixture/types@1.2.3/index.d.ts), [Documented](https://example.com/documented), and [Local](#local).',
    );
  },
  20000,
);
