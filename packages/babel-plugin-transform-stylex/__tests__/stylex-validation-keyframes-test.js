/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
   * stylex.keyframes
   */

  describe('[validation] stylex.keyframes()', () => {
    test('only argument must be an object of objects', () => {
      expect(() => {
        transform(`
          const name = stylex.keyframes(null);
        `);
      }).toThrow(messages.NON_OBJECT_FOR_STYLEX_CALL);
      expect(() => {
        transform(`
          const name = stylex.keyframes({
            from: false
          });
        `);
      }).toThrow(messages.ILLEGAL_NAMESPACE_VALUE);
      expect(() => {
        transform(`
          const name = stylex.keyframes({
            from: {},
            to: {},
          });
        `);
      }).not.toThrow();
      expect(() => {
        transform(`
          const name = stylex.keyframes({
            '0%': {
              opacity: 0
            },
            '50%': {
              opacity: 0.5
            },
          });
        `);
      }).not.toThrow();
    });

    test('allow defined CSS variables in keyframes', () => {
      expect(() => {
        transform(
          `
          const styles = stylex.keyframes({
            from: {
              backgroundColor: 'var(--bar)',
            },
          });
        `,
          {
            definedStylexCSSVariables: {bar: 1},
          },
        );
      }).not.toThrow();
    });

    test('allow undefined CSS variables in keyframes', () => {
      expect(() => {
        transform(
          `
          const styles = stylex.keyframes({
            from: {
              backgroundColor: 'var(--foobar)',
            },
          });
        `,
          {
            definedStylexCSSVariables: {bar: 1},
          },
        );
      }).not.toThrow();
    });
  });
});
