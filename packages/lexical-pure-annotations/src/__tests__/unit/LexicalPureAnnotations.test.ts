/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Plugin} from 'vite';

import {describe, expect, it, vi} from 'vitest';

import {
  PURE_FACTORY_FUNCTIONS,
  pureAnnotations,
  type PureAnnotationsPlugin,
  transformPureAnnotations,
} from '../../index';

const PURE = '/* @__PURE__ */';

function transform(code: string, filename = 'test.ts'): string {
  const result = transformPureAnnotations(code, {filename});
  return result === null ? code : result.code;
}

describe('transformPureAnnotations', () => {
  it('exports the factories the annotations are needed for', () => {
    expect(PURE_FACTORY_FUNCTIONS).toContain('defineExtension');
    expect(PURE_FACTORY_FUNCTIONS).toContain('createCommand');
    expect(PURE_FACTORY_FUNCTIONS).toContain('safeCast');
  });

  it('annotates a module-scope call', () => {
    expect(transform(`export const E = defineExtension({name: 'e'});`)).toBe(
      `export const E = ${PURE} defineExtension({name: 'e'});`,
    );
  });

  it('annotates a call whose initializer is on its own line', () => {
    expect(transform(`export const C =\n  createCommand('C');`)).toBe(
      `export const C =\n  ${PURE} createCommand('C');`,
    );
  });

  it('annotates argument-position calls that would pin the enclosing call', () => {
    expect(
      transform(
        `export const E = defineExtension({config: safeCast({a: 1}), name: 'e'});`,
      ),
    ).toBe(
      `export const E = ${PURE} defineExtension({config: ${PURE} safeCast({a: 1}), name: 'e'});`,
    );
  });

  it('annotates calls nested in an array', () => {
    expect(transform(`const deps = [configExtension(Other, {x: 1})];`)).toBe(
      `const deps = [${PURE} configExtension(Other, {x: 1})];`,
    );
  });

  it('reports how many annotations it inserted', () => {
    const result = transformPureAnnotations(
      `const a = createCommand('a');\nconst b = createCommand('b');`,
    );
    expect(result).not.toBeNull();
    expect(result!.count).toBe(2);
  });

  it('returns null when there is nothing to annotate', () => {
    expect(transformPureAnnotations(`export const x = 1;`)).toBeNull();
    expect(
      transformPureAnnotations(`export const E = ${PURE} defineExtension({});`),
    ).toBeNull();
  });

  it('is idempotent, including for the terser # sigil', () => {
    const code = [
      `export const E = ${PURE} defineExtension({name: 'e'});`,
      `export const C = /* #__PURE__ */ createCommand('C');`,
    ].join('\n');
    expect(transformPureAnnotations(code)).toBeNull();
  });

  it('annotates the call when the annotation precedes the statement instead', () => {
    // An annotation that does not directly precede a call expression has no
    // effect on any bundler, so the call still needs its own.
    expect(transform(`${PURE}\nexport const C = createCommand('C');`)).toBe(
      `${PURE}\nexport const C = ${PURE} createCommand('C');`,
    );
  });

  it('leaves deferred calls alone', () => {
    const code = [
      `export function make() { return createCommand('a'); }`,
      `export const lazy = () => defineImportRule({name: 'r'});`,
      `class A {`,
      `  field = createCommand('field');`,
      `  method() { return createCommand('method'); }`,
      `  static { createCommand('static'); }`,
      `}`,
      `const obj = {method() { return createCommand('obj'); }};`,
    ].join('\n');
    expect(transformPureAnnotations(code)).toBeNull();
  });

  it('leaves calls to functions outside the list alone', () => {
    expect(
      transformPureAnnotations(`const x = someOtherFactory();`),
    ).toBeNull();
  });

  it('accepts a custom function list', () => {
    const result = transformPureAnnotations(
      `const x = myFactory();\nconst y = createCommand('y');`,
      {functions: ['myFactory']},
    );
    expect(result!.code).toBe(
      `const x = ${PURE} myFactory();\nconst y = createCommand('y');`,
    );
  });

  it('parses TypeScript', () => {
    expect(
      transform(
        `export const E = defineExtension({config: safeCast<Config>({}), name: 'e'});\n` +
          `export const identity = <T,>(value: T): T => value;`,
      ),
    ).toContain(`${PURE} safeCast<Config>({})`);
  });

  it('parses TSX', () => {
    expect(
      transform(
        `const el = <div className="x">{'hi'}</div>;\n` +
          `export const E = defineExtension({name: 'e'});`,
        'test.tsx',
      ),
    ).toContain(`${PURE} defineExtension`);
  });

  it('parses JSX in a .js file', () => {
    expect(
      transform(
        `const el = <div />;\nexport const C = createCommand('C');`,
        'test.js',
      ),
    ).toContain(`${PURE} createCommand`);
  });

  it('generates a source map by default and skips it on request', () => {
    const code = `export const C = createCommand('C');`;
    const withMap = transformPureAnnotations(code, {filename: 'a.ts'});
    expect(withMap!.map!.mappings).toEqual(expect.any(String));
    expect(withMap!.map!.sources).toEqual(['a.ts']);
    expect(
      transformPureAnnotations(code, {sourceMap: false})!.map,
    ).toBeUndefined();
  });

  it('throws on source it cannot parse', () => {
    expect(() =>
      transformPureAnnotations(`const x = createCommand(;`),
    ).toThrow();
  });
});

describe('pureAnnotations', () => {
  it('is shaped like a Vite plugin', () => {
    const plugin = pureAnnotations();
    // Type-level assertion: usable in a Vite (and therefore Rollup) config.
    const vitePlugin: Plugin = plugin;
    expect(vitePlugin.name).toBe('@lexical/pure-annotations');
    expect(plugin.enforce).toBe('post');
    expect(pureAnnotations({enforce: 'pre'}).enforce).toBe('pre');
  });

  it('transforms modules and returns a source map', () => {
    const result = pureAnnotations().transform(
      `export const C = createCommand('C');`,
      '/pkg/src/Commands.ts',
    );
    expect(result!.code).toBe(`export const C = ${PURE} createCommand('C');`);
    expect(result!.map!.mappings).toEqual(expect.any(String));
  });

  it('returns null when the module does not change', () => {
    expect(
      pureAnnotations().transform(`export const x = 1;`, '/pkg/src/x.ts'),
    ).toBeNull();
  });

  it('ignores the query string a bundler appends to a module id', () => {
    const result = pureAnnotations().transform(
      `export const C = createCommand('C');`,
      '/pkg/src/Commands.tsx?v=1',
    );
    expect(result!.code).toContain(`${PURE} createCommand`);
  });

  it('only transforms script modules by default', () => {
    const code = `export const C = createCommand('C');`;
    expect(pureAnnotations().transform(code, '/pkg/src/styles.css')).toBeNull();
    expect(pureAnnotations().transform(code, '\0virtual:module')).toBeNull();
  });

  it('honors include and exclude', () => {
    const code = `export const C = createCommand('C');`;
    const included = pureAnnotations({include: /\/wanted\//});
    expect(included.transform(code, '/pkg/wanted/a.ts')).not.toBeNull();
    expect(included.transform(code, '/pkg/other/a.ts')).toBeNull();
    const excluded = pureAnnotations({exclude: [/__tests__/]});
    expect(excluded.transform(code, '/pkg/src/__tests__/a.ts')).toBeNull();
    expect(excluded.transform(code, '/pkg/src/a.ts')).not.toBeNull();
  });

  it('warns and passes through a module it cannot parse', () => {
    const warn = vi.fn();
    const plugin = pureAnnotations() as PureAnnotationsPlugin & {
      transform: (
        this: {warn: (message: string) => void},
        code: string,
        id: string,
      ) => unknown;
    };
    expect(
      plugin.transform.call({warn}, `const x = createCommand(;`, '/pkg/a.ts'),
    ).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('/pkg/a.ts');
  });
});
