/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {parse} from '@babel/parser';
import {defineImportRule} from '@lexical/html';
import {glob} from 'glob';
import {
  configExtension,
  declarePeerDependency,
  defineExtension,
  safeCast,
} from 'lexical';
import * as fs from 'node:fs';
import {describe, expect, it} from 'vitest';

import {INLINE_FACTORY_FORMS, transformPureAnnotations} from '../../index';

const PURE = '/* @__PURE__ */';

/** Values the sample calls are made with, by the name used in the source. */
const SCOPE: Record<string, unknown> = {
  CONFIG: {disabled: false},
  EXTENSION: {name: 'other'},
  RULE: {match: 'p', name: 'rule'},
};

function inline(code: string, filename = 'test.ts') {
  return transformPureAnnotations(code, {filename, inline: true});
}

/**
 * Evaluate an expression from the transform's output against the same values
 * the real factory is called with.
 */
function evaluate(expression: string): unknown {
  const names = Object.keys(SCOPE);
  // eslint-disable-next-line no-new-func -- comparing emitted code to the real function is the point
  return new Function(...names, `return (${expression});`)(
    ...names.map(name => SCOPE[name]),
  );
}

/**
 * Transform `<name>(<args>)` imported from `<specifier>` and return the
 * expression the factory call was replaced with.
 */
function inlinedExpression(
  name: string,
  specifier: string,
  args: string,
): string {
  const result = inline(
    [
      `import {${name}} from '${specifier}';`,
      `export const value = ${name}(${args});`,
    ].join('\n'),
  );
  expect(result).not.toBeNull();
  expect(result!.inlined).toBe(1);
  const {code} = result!;
  return code.slice(code.indexOf('= ') + 2, code.lastIndexOf(';'));
}

describe('inlining', () => {
  it('replaces an identity factory with its argument', () => {
    expect(
      inline(
        [
          `import {safeCast} from 'lexical';`,
          `export const config = safeCast<Config>({disabled: false});`,
          `export const other = safeCast({a: 1});`,
        ].join('\n'),
      )!.code,
    ).toBe(
      [
        // The import goes with the last call to it; see below.
        ``,
        `export const config = {disabled: false};`,
        `export const other = {a: 1};`,
      ].join('\n'),
    );
  });

  it('replaces an args factory with an array of its arguments', () => {
    expect(
      inline(
        [
          `import {configExtension} from '@lexical/extension';`,
          `export const dep = configExtension(Other, {a: 1});`,
        ].join('\n'),
      )!.code,
    ).toContain(`export const dep = [Other, {a: 1}];`);
  });

  it('leaves nothing to annotate once the whole definition is a literal', () => {
    const result = inline(
      [
        `import {defineExtension, safeCast} from 'lexical';`,
        `export const E = defineExtension({`,
        `  config: safeCast<Config>({disabled: false}),`,
        `  name: 'e',`,
        `});`,
      ].join('\n'),
    )!;
    expect(result.count).toBe(0);
    expect(result.inlined).toBe(2);
    expect(result.code).not.toContain('__PURE__');
    expect(result.code).toContain(`export const E = {`);
  });

  it('removes an annotation that would be left in front of a literal', () => {
    const result = inline(
      [
        `import {defineExtension} from 'lexical';`,
        `export const E = ${PURE} defineExtension({name: 'e'});`,
      ].join('\n'),
    )!;
    expect(result.code).toContain(`export const E = {name: 'e'};`);
    expect(result.code).not.toContain('__PURE__');
  });

  it('annotates rather than inlines when the call does not fit the form', () => {
    const cases = [
      // A spread argument cannot be mapped onto the parameters.
      `export const c = safeCast(...values);`,
      // `declarePeerDependency(name)` returns `[name, undefined]`, which is
      // not what `[name]` would be.
      `export const p = declarePeerDependency('peer');`,
    ];
    for (const line of cases) {
      const result = inline(
        [`import {declarePeerDependency, safeCast} from 'lexical';`, line].join(
          '\n',
        ),
      )!;
      expect(result.inlined).toBe(0);
      expect(result.count).toBe(1);
    }
  });

  it('leaves a call whose result is discarded alone', () => {
    // `{name: 'e'};` as a statement is a block, not an object.
    const result = inline(
      [
        `import {defineExtension} from 'lexical';`,
        `defineExtension({name: 'e'});`,
      ].join('\n'),
    )!;
    expect(result.inlined).toBe(0);
    expect(result.code).toContain(`${PURE} defineExtension({name: 'e'});`);
  });

  it('removes the import once nothing calls the factory any more', () => {
    expect(
      inline(
        [
          `import {defineExtension} from 'lexical';`,
          `export const E = defineExtension({name: 'e'});`,
        ].join('\n'),
      )!.code,
    ).toBe(['', `export const E = {name: 'e'};`].join('\n'));
  });

  it('keeps the specifiers that are still used', () => {
    expect(
      inline(
        [
          `import {createCommand, defineExtension} from 'lexical';`,
          `export const C = createCommand('C');`,
          `export const E = defineExtension({name: 'e'});`,
        ].join('\n'),
      )!.code,
    ).toBe(
      [
        `import {createCommand} from 'lexical';`,
        `export const C = ${PURE} createCommand('C');`,
        `export const E = {name: 'e'};`,
      ].join('\n'),
    );
  });

  it('keeps an import that is still referenced from inside a function', () => {
    const result = inline(
      [
        `import {safeCast} from 'lexical';`,
        `export const config = safeCast({a: 1});`,
        `export function later() {`,
        `  return safeCast({b: 2});`,
        `}`,
      ].join('\n'),
    )!;
    expect(result.code).toContain(`import {safeCast} from 'lexical';`);
    expect(result.code).toContain(`export const config = {a: 1};`);
  });

  it('keeps an import that is referenced as a value', () => {
    const result = inline(
      [
        `import {safeCast} from 'lexical';`,
        `export const config = safeCast({a: 1});`,
        `export const alias = safeCast;`,
      ].join('\n'),
    )!;
    expect(result.code).toContain(`import {safeCast} from 'lexical';`);
  });

  it('keeps an import that is re-exported', () => {
    const result = inline(
      [
        `import {defineExtension} from 'lexical';`,
        `export const E = defineExtension({name: 'e'});`,
        `export {defineExtension};`,
      ].join('\n'),
    )!;
    expect(result.code).toContain(`import {defineExtension} from 'lexical';`);
    expect(result.code).toContain(`export const E = {name: 'e'};`);
  });

  it('keeps an import that is re-exported under another name', () => {
    const result = inline(
      [
        `import {safeCast} from 'lexical';`,
        `export const config = safeCast({a: 1});`,
        `export {safeCast as castSafely};`,
      ].join('\n'),
    )!;
    expect(result.code).toContain(`import {safeCast} from 'lexical';`);
  });

  it('does not mistake a property of the same name for a reference', () => {
    const result = inline(
      [
        `import {defineExtension} from 'lexical';`,
        `export const E = defineExtension({name: 'e'});`,
        `export const shape = {defineExtension: 1};`,
        `export const read = shape.defineExtension;`,
      ].join('\n'),
    )!;
    expect(result.code).not.toContain('import {');
  });

  it('does not inline unless asked to', () => {
    const code = [
      `import {safeCast} from 'lexical';`,
      `export const config = safeCast({disabled: false});`,
    ].join('\n');
    const result = transformPureAnnotations(code, {filename: 'test.ts'})!;
    expect(result.inlined).toBe(0);
    expect(result.code).toContain(`${PURE} safeCast(`);
  });

  it('only inlines factories that resolve to Lexical', () => {
    expect(
      transformPureAnnotations(
        [
          `import {safeCast} from 'some-other-library';`,
          `export const config = safeCast({disabled: false});`,
        ].join('\n'),
        {filename: 'test.ts', inline: true},
      ),
    ).toBeNull();
  });
});

describe('the inlined factories are still trivial', () => {
  // These replacements are only correct while the factories really do return
  // a trivial expression over their arguments. Compare what the transform
  // emits against what the real function returns, so that changing one of
  // them without updating the transform fails here rather than silently
  // producing wrong code in somebody's bundle.
  it('safeCast returns its argument', () => {
    const expression = inlinedExpression('safeCast', 'lexical', 'CONFIG');
    expect(evaluate(expression)).toBe(safeCast(SCOPE.CONFIG));
    expect(evaluate(expression)).toBe(SCOPE.CONFIG);
  });

  it('defineExtension returns its argument', () => {
    const expression = inlinedExpression(
      'defineExtension',
      'lexical',
      'EXTENSION',
    );
    expect(evaluate(expression)).toBe(
      defineExtension(SCOPE.EXTENSION as Parameters<typeof defineExtension>[0]),
    );
  });

  it('defineImportRule returns its argument', () => {
    const expression = inlinedExpression(
      'defineImportRule',
      '@lexical/html',
      'RULE',
    );
    expect(evaluate(expression)).toBe(
      defineImportRule(SCOPE.RULE as Parameters<typeof defineImportRule>[0]),
    );
  });

  it('configExtension returns its arguments as an array', () => {
    const expression = inlinedExpression(
      'configExtension',
      '@lexical/extension',
      'EXTENSION, CONFIG',
    );
    expect(evaluate(expression)).toEqual(
      configExtension(
        ...([SCOPE.EXTENSION, SCOPE.CONFIG] as Parameters<
          typeof configExtension
        >),
      ),
    );
  });

  it('declarePeerDependency returns its arguments as an array', () => {
    const expression = inlinedExpression(
      'declarePeerDependency',
      'lexical',
      `'peer', CONFIG`,
    );
    // The generic is what gives `name` and `config` their types; this test
    // is about what the function returns at runtime.
    const declarePeer = declarePeerDependency as (
      name: string,
      config?: unknown,
    ) => unknown;
    expect(evaluate(expression)).toEqual(declarePeer('peer', SCOPE.CONFIG));
  });

  it('is marked as inlinable wherever it is defined', () => {
    // The marker is the other half of the contract: it tells whoever edits
    // one of these functions that its body is being reproduced by the build.
    const marked = new Map<string, string>();
    for (const file of glob.sync('packages/*/src/**/*.{ts,tsx}', {
      ignore: ['**/__tests__/**'],
      windowsPathsNoEscape: true,
    })) {
      const code = fs.readFileSync(file, 'utf8');
      if (!code.includes('@lexicalInline')) {
        continue;
      }
      const ast = parse(code, {plugins: ['typescript'], sourceType: 'module'});
      for (const statement of ast.program.body) {
        const declaration =
          statement.type === 'ExportNamedDeclaration' && statement.declaration
            ? statement.declaration
            : statement;
        const marker = (statement.leadingComments || [])
          .map(comment => /@lexicalInline\s+(\w+)/.exec(comment.value))
          .find(Boolean);
        if (marker && declaration.type === 'FunctionDeclaration') {
          marked.set(declaration.id!.name, marker[1]);
        }
      }
    }
    expect(Object.fromEntries(marked)).toEqual(
      Object.fromEntries(INLINE_FACTORY_FORMS),
    );
  });
});
