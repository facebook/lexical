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
import rule from '../../rules/no-pure-annotation.js';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-pure-annotation', () => {
  it('is exported by the plugin with a fixer', () => {
    expect(plugin.rules['no-pure-annotation']).toBe(rule);
    expect(rule.meta!.fixable).toBe('code');
  });

  it('passes RuleTester', () => {
    ruleTester.run('no-pure-annotation', rule, {
      invalid: [
        {
          code: `export const MyExtension = /* @__PURE__ */ defineExtension({name: 'my'});`,
          errors: [{messageId: 'unnecessaryPureAnnotation'}],
          output: `export const MyExtension = defineExtension({name: 'my'});`,
        },
        {
          // Terser's # sigil is the same annotation.
          code: `export const MY_COMMAND = /* #__PURE__ */ createCommand('MY_COMMAND');`,
          errors: [{messageId: 'unnecessaryPureAnnotation'}],
          output: `export const MY_COMMAND = createCommand('MY_COMMAND');`,
        },
        {
          // Prettier moves a long one onto its own line; the fix takes the
          // line break with it.
          code: `export const E =\n  /* @__PURE__ */\n  defineExtension({name: 'e'});`,
          errors: [{messageId: 'unnecessaryPureAnnotation'}],
          output: `export const E =\n  defineExtension({name: 'e'});`,
        },
        {
          // Nested argument-position calls were annotated too.
          code: `export const E = /* @__PURE__ */ defineExtension({config: /* @__PURE__ */ safeCast({a: 1}), name: 'e'});`,
          errors: [
            {messageId: 'unnecessaryPureAnnotation'},
            {messageId: 'unnecessaryPureAnnotation'},
          ],
          output: `export const E = defineExtension({config: safeCast({a: 1}), name: 'e'});`,
        },
        {
          // Custom function list replaces the default.
          code: `const x = /* @__PURE__ */ myFactory();`,
          errors: [{messageId: 'unnecessaryPureAnnotation'}],
          options: [{functions: ['myFactory']}],
          output: `const x = myFactory();`,
        },
      ],
      valid: [
        {
          // What the sources should look like.
          code: `export const MyExtension = defineExtension({name: 'my'});`,
        },
        {
          // Not one of the factories the build annotates: somebody wrote
          // this annotation on purpose and it is not ours to remove.
          code: `const rule = {match: /* @__PURE__ */ sel.tag('o:p')};\nexport default rule;`,
        },
        {
          // Deferred calls are never annotated by the build, so an
          // annotation there was deliberate too.
          code: `export function make() { return /* @__PURE__ */ createCommand('LATE'); }`,
        },
        {
          code: `export const lazy = () => /* @__PURE__ */ defineImportRule({name: 'r'});`,
        },
        {
          // A comment that is not the annotation.
          code: `export const E = /* the extension */ defineExtension({name: 'e'});`,
        },
        {
          // Custom function list replaces the default.
          code: `const x = /* @__PURE__ */ defineExtension({name: 'n'});`,
          options: [{functions: ['myFactory']}],
        },
      ],
    });
  });
});
