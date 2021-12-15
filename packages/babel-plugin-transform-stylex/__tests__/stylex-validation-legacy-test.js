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
   * Legacy API
   */

  describe('[validation] legacy API', () => {
    test('disallows referring to an unknown string namespace', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({});
          styles('foo');
        `);
      }).toThrow(messages.UNKNOWN_NAMESPACE);
    });

    test('disallows referring to an unknown object namespace', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({});
          styles({foo: true});
        `);
      }).toThrow(messages.UNKNOWN_NAMESPACE);
    });

    test('allow uncomputed properties to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({foo: {}, bar: {}});
          styles({
            foo: true,
            bar: true,
          });
        `);
      }).not.toThrow();
    });

    test('disallow computed properties to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({});
          styles({
            [foo]: true,
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
    });

    test('disallow object spread to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({});
          styles({
            ...foo,
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
    });

    test('allow static strings to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({foo: {}, bar: {}});
          styles('foo', 'bar');
        `);
      }).not.toThrow();
    });

    test('allow static strings to stylex.create value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({foo: {}, bar: {}});
          styles('foo', 'bar');
        `);
      }).not.toThrow();
    });

    test('allow conditional strings to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({foo: {}, bar: {}, yes: {}});
          styles('foo', true ? 'bar' : 'yes');
        `);
      }).not.toThrow();
    });

    test('disallow call expression to stylex value call', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({});
          styles(foo());
        `);
      }).toThrow(messages.ILLEGAL_NAMESPACE_TYPE);
    });
  });
});
