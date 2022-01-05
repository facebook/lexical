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
   * stylex imports
   */

  describe('[validation] stylex imports', () => {
    test('ignore non-stylex imports', () => {
      expect(() => {
        transform(`
          import classnames from 'classnames';
        `);
      }).not.toThrow();
    });

    test('require("stylex") must be bound to "stylex"', () => {
      expect(() => {
        transform(`
          const foo = require('stylex');
        `);
      }).toThrow(messages.ILLEGAL_REQUIRE);
      expect(() => {
        transform(`
          const {stylex} = require('stylex');
        `);
      }).toThrow(messages.ILLEGAL_REQUIRE);
      expect(() => {
        transform(`
          const stylex = require('stylex');
        `);
      }).not.toThrow();
    });

    test('import "stylex" must be bound to "stylex"', () => {
      expect(() => {
        transform(`
          import foo from 'stylex';
        `);
      }).toThrow(messages.ILLEGAL_IMPORT);
      expect(() => {
        transform(`
          import {stylex} from 'stylex';
        `);
      }).toThrow(messages.ILLEGAL_IMPORT);
      expect(() => {
        transform(`
          import stylex from 'stylex';
        `);
      }).not.toThrow();
    });

    test('support named export of stylex.create()', () => {
      expect(() => {
        transform(`
          export const styles = stylex.create({});
        `);
      }).not.toThrow();
    });

    test('support default export of stylex.create()', () => {
      expect(() => {
        transform(`
          export default stylex.create({});
        `);
      }).not.toThrow();
    });
  });
});
