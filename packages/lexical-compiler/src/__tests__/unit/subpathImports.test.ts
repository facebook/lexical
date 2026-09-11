/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {transformSync} from 'esbuild';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {runInNewContext} from 'node:vm';
import {rollup} from 'rollup';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {subpathImports} from '../../SubpathImports';

let dir: string;
let packageJson: string;

function write(file: string, code: string) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
  fs.writeFileSync(path.join(dir, file), code);
}

function plugin(strict = true) {
  return subpathImports({packages: [packageJson], strict});
}

function transform(code: string, filename = 'consumer.ts', strict = true) {
  return plugin(strict).transform(code, path.join(dir, filename))?.code ?? code;
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lexical-subpath-imports-'));
  packageJson = path.join(dir, 'package.json');
  write(
    'package.json',
    JSON.stringify({
      exports: {
        '.': {default: './src/index.ts', source: './src/index.ts'},
        './big': {default: './src/big.ts', source: './src/big.ts'},
        './small': {default: './src/small.ts', source: './src/small.ts'},
      },
      name: '@lexical/example',
      sideEffects: false,
    }),
  );
  write(
    'src/index.ts',
    `
    export {value as publicValue, default as defaultValue, type Thing} from './small';
    export {unused} from './big';
  `,
  );
  write(
    'src/small.ts',
    `export const value = {}; export default value; export type Thing = {x: number};`,
  );
  write('src/big.ts', `export const unused = 'unwanted extension';`);
});

afterEach(() => fs.rmSync(dir, {force: true, recursive: true}));

describe('subpathImports', () => {
  it('derives renamed and default bindings from the installed barrel', () => {
    const output = transform(
      `import {publicValue as local, defaultValue} from '@lexical/example'; console.log(local, defaultValue);`,
    );
    expect(output).toContain(
      'import {value as local} from "@lexical/example/small";',
    );
    expect(output).toContain(
      'import {default as defaultValue} from "@lexical/example/small";',
    );
    expect(output).toContain('console.log(local, defaultValue)');
  });

  it('preserves re-export aliases and type-only bindings', () => {
    expect(
      transform(`export {publicValue as renamed} from '@lexical/example';`),
    ).toBe('export {value as renamed} from "@lexical/example/small";');
    const code = `import type {Thing} from '@lexical/example';`;
    expect(transform(code)).toBe(code);
    const mixed = transform(
      `import {type Thing, publicValue} from '@lexical/example';`,
    );
    expect(mixed).toContain('import {type Thing} from "@lexical/example";');
    expect(transformSync(mixed, {loader: 'ts'}).code).not.toContain(
      '@lexical/example"',
    );
  });

  it('externalizes public sibling entries, including relative barrel paths', () => {
    expect(transform(`export {value} from './small';`, 'src/index.ts')).toBe(
      'export {value} from "@lexical/example/small";',
    );
    expect(
      transform(`import {publicValue} from './index.js';`, 'src/consumer.ts'),
    ).toBe('import {value as publicValue} from "@lexical/example/small";');
    const privateImport = `import {helper} from './private';`;
    expect(transform(privateImport, 'src/small.ts')).toBe(privateImport);
  });

  it('follows compatibility exports to a different package', () => {
    write('src/index.ts', `export {defineExtension as define} from 'lexical';`);
    expect(transform(`import {define} from '@lexical/example';`)).toBe(
      'import {defineExtension as define} from "lexical";',
    );
  });

  it('supports transparent star barrels without accidentally exporting default', () => {
    write('src/index.ts', `export * from './small';`);
    expect(transform(`import {value} from '@lexical/example';`)).toBe(
      'import {value} from "@lexical/example/small";',
    );
    expect(() => transform(`import value from '@lexical/example';`)).toThrow(
      'unknown barrel export',
    );
  });

  it('does not bypass executable root entry points', () => {
    write(
      'src/index.ts',
      `globalThis.initialized = true; export {value} from './small';`,
    );
    const code = `import {value} from '@lexical/example';`;
    expect(transform(code)).toBe(code);
  });

  it('does not bypass packages that may initialize unused modules', () => {
    const metadata = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    delete metadata.sideEffects;
    write('package.json', JSON.stringify(metadata));
    const code = `import {publicValue} from '@lexical/example';`;
    expect(transform(code)).toBe(code);
  });

  it('resolves package names from the consumer root without evaluating them', () => {
    const consumer = path.join(dir, 'consumer');
    fs.mkdirSync(path.join(consumer, 'node_modules/@lexical'), {
      recursive: true,
    });
    fs.symlinkSync(
      dir,
      path.join(consumer, 'node_modules/@lexical/example'),
      'junction',
    );
    const instance = subpathImports({
      packages: ['@lexical/example'],
      root: consumer,
      strict: true,
    });
    expect(
      instance.transform(
        `import {publicValue} from '@lexical/example';`,
        path.join(consumer, 'index.ts'),
      )?.code,
    ).toContain('@lexical/example/small');
  });

  it.each([
    `import * as extension from '@lexical/example';`,
    `import '@lexical/example';`,
    `export * from '@lexical/example';`,
    `export * as extension from '@lexical/example';`,
    `const extension = import('@lexical/example');`,
    `const extension = require('@lexical/example');`,
  ])('rejects unsplittable usage in strict mode: %s', code => {
    expect(() => transform(code)).toThrow('use named subpath imports');
    expect(transform(code, 'consumer.ts', false)).toBe(code);
  });

  it('fails on missing exports instead of silently retaining the barrel', () => {
    expect(() => transform(`import {typo} from '@lexical/example';`)).toThrow(
      'unknown barrel export @lexical/example:typo',
    );
  });

  it('refreshes the mapping on rebuild and watches its source files', () => {
    const instance = plugin();
    const watched: string[] = [];
    const context = {addWatchFile: (file: string) => watched.push(file)};
    instance.buildStart.call(context);
    expect(watched).toContain(packageJson);
    expect(watched).toContain(path.join(dir, 'src/index.ts'));
    write('src/index.ts', `export {unused as publicValue} from './big';`);
    instance.buildStart.call(context);
    expect(
      instance.transform(
        `import {publicValue} from '@lexical/example';`,
        path.join(dir, 'consumer.ts'),
      )?.code,
    ).toContain('unused as publicValue');
  });

  it('produces source maps and handles TSX and query-suffixed module IDs', () => {
    const result = plugin().transform(
      `import {publicValue} from '@lexical/example'; export const x = <div>{publicValue}</div>;`,
      path.join(dir, 'consumer.tsx?direct'),
    );
    expect(result?.map.sourcesContent?.[0]).toContain('<div>');
    expect(result?.code).toContain('@lexical/example/small');
    expect(plugin().transform('not JavaScript', 'styles.css')).toBeNull();
  });

  async function bundle(code: string, strict: boolean) {
    write('consumer.ts', code);
    const build = await rollup({
      input: path.join(dir, 'consumer.ts'),
      plugins: [
        plugin(strict),
        {
          name: 'fixture-resolution',
          resolveId(source) {
            if (source === '@lexical/example')
              return path.join(dir, 'src/index.ts');
            if (source.startsWith('@lexical/example/'))
              return path.join(dir, `src/${source.split('/').pop()}.ts`);
            return null;
          },
          transform(source, id) {
            return {
              code: transformSync(source, {loader: 'ts', sourcefile: id}).code,
              map: null,
            };
          },
        },
      ],
      treeshake: false,
    });
    try {
      const {output} = await build.generate({format: 'cjs'});
      return {code: output[0].code, modules: Object.keys(output[0].modules)};
    } finally {
      await build.close();
    }
  }

  it('excludes unrelated extensions with tree-shaking disabled', async () => {
    const result = await bundle(
      `export {publicValue} from '@lexical/example';`,
      true,
    );
    expect(result.modules).toContain(path.join(dir, 'src/small.ts'));
    expect(result.modules).not.toContain(path.join(dir, 'src/index.ts'));
    expect(result.modules).not.toContain(path.join(dir, 'src/big.ts'));
    expect(result.code).not.toContain('unwanted extension');
  });

  it('preserves barrel consumers and shared object identity without tree-shaking', async () => {
    const result = await bundle(
      `import * as all from '@lexical/example'; import {value} from '@lexical/example/small'; export const same = all.publicValue === value; export {all};`,
      false,
    );
    const exports: {same?: boolean; all?: Record<string, unknown>} = {};
    // Execute the generated fixture, which has no external dependencies.
    runInNewContext(result.code, {exports});
    expect(exports.same).toBe(true);
    expect(Object.keys(exports.all || {}).sort()).toEqual([
      'defaultValue',
      'publicValue',
      'unused',
    ]);
    expect(
      result.modules.filter(file => file.endsWith('/small.ts')),
    ).toHaveLength(1);
  });
});
