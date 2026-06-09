/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {RuleTester} from 'eslint';
import {describe, expect, it} from 'vitest';

import plugin from '../../index.js';
import rule from '../../rules/require-pure-annotation.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-pure-annotation', () => {
  it('is exported by the plugin with a fixer', () => {
    expect(plugin.rules['require-pure-annotation']).toBe(rule);
    expect(rule.meta!.fixable).toBe('code');
  });

  it('passes RuleTester', () => {
    ruleTester.run('require-pure-annotation', rule, {
      invalid: [
        {
          code: `export const MyExtension = defineExtension({name: 'my'});`,
          errors: [{messageId: 'missingPureAnnotation'}],
          output: `export const MyExtension = /* @__PURE__ */ defineExtension({name: 'my'});`,
        },
        {
          // Initializer on its own line.
          code: `export const MY_COMMAND =\n  createCommand('MY_COMMAND');`,
          errors: [{messageId: 'missingPureAnnotation'}],
          output: `export const MY_COMMAND =\n  /* @__PURE__ */ createCommand('MY_COMMAND');`,
        },
        {
          // An unannotated argument-position call pins the (annotated)
          // enclosing call, so it is required too.
          code: `export const E = /* @__PURE__ */ defineExtension({config: safeCast({a: 1}), name: 'e'});`,
          errors: [{messageId: 'missingPureAnnotation'}],
          output: `export const E = /* @__PURE__ */ defineExtension({config: /* @__PURE__ */ safeCast({a: 1}), name: 'e'});`,
        },
        {
          // Module-scope call nested in an array.
          code: `const deps = [configExtension(Other, {x: 1})];\nexport default deps;`,
          errors: [{messageId: 'missingPureAnnotation'}],
          output: `const deps = [/* @__PURE__ */ configExtension(Other, {x: 1})];\nexport default deps;`,
        },
        {
          // Custom function list replaces the default.
          code: `const x = myFactory();`,
          errors: [{messageId: 'missingPureAnnotation'}],
          options: [{functions: ['myFactory']}],
          output: `const x = /* @__PURE__ */ myFactory();`,
        },
      ],
      valid: [
        {
          code: `export const MyExtension = /* @__PURE__ */ defineExtension({name: 'my'});`,
        },
        {
          // Terser-style # sigil is accepted.
          code: `export const MY_COMMAND = /* #__PURE__ */ createCommand('MY_COMMAND');`,
        },
        {
          // Calls deferred inside function bodies don't affect
          // tree-shaking of the module's top-level statements.
          code: `export function makeCommand() { return createCommand('LATE'); }`,
        },
        {
          code: `export const lazy = () => defineImportRule({name: 'r'});`,
        },
        {
          // Unlisted functions are not the rule's business.
          code: `const x = someOtherFactory({});`,
        },
        {
          // Custom function list replaces the default.
          code: `const x = defineExtension({name: 'n'});`,
          options: [{functions: ['myFactory']}],
        },
      ],
    });
  });
});
