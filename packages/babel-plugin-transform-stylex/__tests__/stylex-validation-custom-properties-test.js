/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

jest.autoMockOff();

const {transformSync} = require('@babel/core');
const messages = require('../src/messages');
const stylexPlugin = require('../src/index');

function transform(source, opts = {}) {
  return transformSync(source, {
    filename: opts.filename,
    parserOpts: {
      flow: {
        all: true,
      },
    },
    plugins: [[stylexPlugin, opts]],
  });
}

describe('babel-plugin-transform-stylex', () => {
  /**
   * stylex imports
   */

  describe('[validation] CSS custom properties', () => {
    test('disallow unclosed style value functions', () => {
      expect(() => {
        transform(
          `
          const styles = stylex.create({default: {color: 'var(--foo'}})
        `,
          {definedStylexCSSVariables: {foo: 1}},
        );
      }).toThrow(messages.LINT_UNCLOSED_FUNCTION);
    });

    test('disallow unprefixed custom properties', () => {
      expect(() => {
        transform(
          `
          const styles = stylex.create({default: {color: 'var(foo'}})
        `,
          {definedStylexCSSVariables: {foo: 1}},
        );
      }).toThrow();
    });

    test('allow defined custom properties', () => {
      expect(() => {
        transform(
          `
          const styles = stylex.create({foo: { color: 'var(--foo)' }});
        `,
          {definedStylexCSSVariables: {foo: 1}},
        );
      }).not.toThrow();
      expect(() => {
        transform(
          `
          const styles = stylex.create({foo: { backgroundColor: 'var(--foo)', color: 'var(--bar)' }});
        `,
          {definedStylexCSSVariables: {foo: 1, bar: 1}},
        );
      }).not.toThrow();
    });

    test('allow undefined custom properties', () => {
      expect(() => {
        transform(`
const styles = stylex.create({foo: { color: 'var(--foobar)' }});
        `);
      }).not.toThrow();
      expect(() => {
        transform(
          `
const styles = stylex.create({foo: { color: 'var(--foobar)' }});
        `,
          {definedStylexCSSVariables: null},
        );
      }).not.toThrow();
      expect(() => {
        transform(
          `
const styles = stylex.create({foo: { color: 'var(--foobar)' }});
        `,
          {definedStylexCSSVariables: undefined},
        );
      }).not.toThrow();
      expect(() => {
        transform(
          `
const styles = stylex.create({foo: { color: 'var(--foobar)' }});
        `,
          {definedStylexCSSVariables: {foo: 1}},
        );
      }).not.toThrow();
      expect(() => {
        transform(
          `
        const styles = stylex.create({foo: { backgroundColor: 'var(--foofoo)', color: 'var(--foobar)' }});
        `,
          {definedStylexCSSVariables: {foo: 1, bar: 1}},
        );
      }).not.toThrow();
    });
  });
});
