/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

jest.autoMockOff();

const {transformSync} = require('@babel/core');
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
  }).code;
}

describe('babel-plugin-transform-stylex', () => {
  /**
   * CSS polyfills
   */

  describe.skip('[transform] stylex polyfills', () => {
    test('lineClamp', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { lineClamp: 3 } });
        `),
      ).toMatchInlineSnapshot();
    });

    test('pointerEvents', () => {
      expect(
        transform(`
          const styles = stylex.create({
            a: { pointerEvents: 'auto' },
            b: { pointerEvents: 'box-none' },
            c: { pointerEvents: 'box-only' },
            d: { pointerEvents: 'none' }
          });
        `),
      ).toMatchInlineSnapshot();
    });

    test('scrollbarWidth', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { scrollbarWidth: 'none' } });
        `),
      ).toMatchInlineSnapshot();
    });
  });
});
