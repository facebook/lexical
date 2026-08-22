/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as path from 'node:path';
import {describe, expect, it} from 'vitest';

import {
  PURE_NAMESPACES,
  pureAnnotations,
  transformPureAnnotations,
} from '../../index';

const PURE = '/* @__PURE__ */';

function transform(code: string, filename = 'test.ts') {
  return transformPureAnnotations(code, {filename, inline: true});
}

function strict(code: string, filename = 'test.ts') {
  return transformPureAnnotations(code, {filename, inline: true, strict: true});
}

describe('namespaces', () => {
  it('exports the namespaces whose methods are side-effect free', () => {
    expect(PURE_NAMESPACES).toContain('sel');
  });

  it('annotates a method call on a namespace imported from Lexical', () => {
    expect(
      transform(
        [
          `import {sel} from '@lexical/html';`,
          `export const match = sel.tag('p');`,
        ].join('\n'),
      )!.code,
    ).toContain(`export const match = ${PURE}sel.tag('p');`);
  });

  it('annotates a chain once, at the call the bundlers look at', () => {
    // rollup, terser and esbuild all drop the whole chain from a single
    // annotation on the outermost call.
    const result = transform(
      [
        `import {sel} from '@lexical/html';`,
        `export const match = sel.tag('span').attr('data-x', true);`,
      ].join('\n'),
    )!;
    expect(result.count).toBe(1);
    expect(result.code).toContain(
      `= ${PURE}sel.tag('span').attr('data-x', true);`,
    );
  });

  it('leaves a same-named object of somebody else alone', () => {
    expect(
      transformPureAnnotations(
        [
          `import {sel} from 'some-other-library';`,
          `export const match = sel.tag('p');`,
        ].join('\n'),
        {filename: 'test.ts'},
      ),
    ).toBeNull();
  });

  it('follows a relative import to a marked namespace, and its aliases', () => {
    const result = transformPureAnnotations(
      [
        `import {pureThings} from './fixtures/factories';`,
        `const things = pureThings;`,
        `export const one = pureThings.of(1);`,
        `export const two = things.named('two');`,
      ].join('\n'),
      {filename: path.join(__dirname, 'virtual.ts')},
    )!;
    expect(result.code).toContain(
      `export const one = ${PURE}pureThings.of(1);`,
    );
    expect(result.code).toContain(
      `export const two = ${PURE}things.named('two');`,
    );
  });
});

describe('strict', () => {
  it('rejects a call inside a definition that nothing vouches for', () => {
    expect(() =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `import {gfmTable} from 'mdast-util-gfm-table';`,
          `export const E = defineExtension({`,
          `  config: {extensions: [gfmTable()]},`,
          `  name: 'e',`,
          `});`,
        ].join('\n'),
        '/repo/src/E.ts',
      ),
    ).toThrow(/4:25 gfmTable\(\.\.\.\) inside defineExtension\(\.\.\.\)/);
  });

  it('accepts the same call once it is annotated by hand', () => {
    expect(() =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `import {gfmTable} from 'mdast-util-gfm-table';`,
          `export const E = defineExtension({`,
          `  config: {extensions: [${PURE} gfmTable()]},`,
          `  name: 'e',`,
          `});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });

  it('accepts a call the transform annotates for itself', () => {
    expect(() =>
      strict(
        [
          `import {defineImportRule, sel} from '@lexical/html';`,
          `export const Rule = defineImportRule({`,
          `  match: sel.tag('span'),`,
          `  name: 'r',`,
          `});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });

  it('accepts a factory of your own that declares itself side-effect free', () => {
    // Declared in this module, so it does not have to be one of the names
    // the transform knows.
    expect(() =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `/**`,
          ` * @__NO_SIDE_EFFECTS__`,
          ` */`,
          `function makeRules() { return []; }`,
          `export const E = defineExtension({name: 'e', rules: makeRules()});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });

  it('accepts the built-ins bundlers already know are pure', () => {
    expect(() =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `export const E = defineExtension({`,
          `  exports: new Map([['a', 1]]),`,
          `  name: 'e',`,
          `  tags: new Set(['x']),`,
          `});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });

  it('ignores calls that only run later', () => {
    // A call in a callback or a method body does not run when the module is
    // initialized, so it pins nothing.
    expect(() =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `export const E = defineExtension({`,
          `  name: 'e',`,
          `  nodes: () => [makeNode()],`,
          `  register(editor) { return registerThing(editor); },`,
          `});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });

  it('names every offender, not just the first', () => {
    const run = () =>
      strict(
        [
          `import {defineExtension} from 'lexical';`,
          `import {a, b} from 'somewhere';`,
          `export const E = defineExtension({config: {x: a(), y: b()}, name: 'e'});`,
        ].join('\n'),
      );
    expect(run).toThrow(/2 call\(s\)/);
    expect(run).toThrow(/a\(\.\.\.\)/);
    expect(run).toThrow(/b\(\.\.\.\)/);
  });

  it('does not hold a dependency to it, but still annotates one', () => {
    // A Lexical resolved out of node_modules through its `source` export
    // condition is exactly what this package exists for, so a dependency is
    // annotated and inlined like anything else. What it is not is held to
    // the check: a definition somebody else shipped is not the building
    // project's to fix.
    const vendored = pureAnnotations({inline: true, strict: true}).transform(
      [
        `import {defineExtension, safeCast} from 'lexical';`,
        `export const E = defineExtension({config: safeCast({a: 1}), name: 'e'});`,
      ].join('\n'),
      '/app/node_modules/@lexical/mark/src/index.ts',
    );
    expect(vendored!.code).toContain(
      `export const E = {config: {a: 1}, name: 'e'};`,
    );

    const code = [
      `import {defineExtension} from 'lexical';`,
      `import {thing} from 'somewhere';`,
      `export const E = defineExtension({config: {x: thing()}, name: 'e'});`,
    ].join('\n');
    const plugin = pureAnnotations({inline: true, strict: true});
    expect(() =>
      plugin.transform(code, '/app/node_modules/some-dep/dist/index.mjs'),
    ).not.toThrow();
    expect(() => plugin.transform(code, '/app/src/E.ts')).toThrow(
      /cannot be tree-shaken/,
    );
  });

  it('is off unless asked for', () => {
    expect(() =>
      transform(
        [
          `import {defineExtension} from 'lexical';`,
          `import {gfmTable} from 'mdast-util-gfm-table';`,
          `export const E = defineExtension({extensions: [gfmTable()], name: 'e'});`,
        ].join('\n'),
      ),
    ).not.toThrow();
  });
});
