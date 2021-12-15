/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
  describe('[transform] stylex imports', () => {
    test('ignores valid imports', () => {
      expect(
        transform(`
          import stylex from 'stylex';
          import {foo, bar} from 'other';
        `),
      ).toMatchInlineSnapshot(`
        "import stylex from 'stylex';
        import { foo, bar } from 'other';"
      `);
    });

    test('ignores valid requires', () => {
      expect(
        transform(`
          const stylex = require('stylex');
          const {foo, bar} = require('other');
        `),
      ).toMatchInlineSnapshot(`
        "const stylex = require('stylex');

        const {
          foo,
          bar
        } = require('other');"
      `);
    });

    test('named declaration export', () => {
      expect(
        transform(`
          export const styles = (stylex.create({
            foo: {
              color: 'red'
            },
          }));
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        export const styles = {
          foo: {
            color: \\"h3ivgpu3\\"
          }
        };"
      `);
    });

    test('named property export', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              color: 'red'
            },
          });
          export {styles}
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        const styles = {
          foo: {
            color: \\"h3ivgpu3\\"
          }
        };
        export { styles };"
      `);
    });

    test('default export', () => {
      expect(
        transform(`
          export default (stylex.create({
            foo: {
              color: 'red'
            },
          }));
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        export default {
          foo: {
            color: \\"h3ivgpu3\\"
          }
        };"
      `);
    });

    test('module.export', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              color: 'red'
            },
          });
          module.export = styles;
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        const styles = {
          foo: {
            color: \\"h3ivgpu3\\"
          }
        };
        module.export = styles;"
      `);
    });
  });
});
