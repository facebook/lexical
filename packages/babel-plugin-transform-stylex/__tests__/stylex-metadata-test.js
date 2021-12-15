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
    plugins: [stylexPlugin, opts],
  });
}

describe('babel-plugin-transform-stylex', () => {
  describe('[metadata] plugin metadata', () => {
    test('stylex metadata is correctly set', () => {
      const output = transform(`
        const styles = stylex.create({
          foo: {
            color: 'red',
            height: 5,
            ':hover': {
              start: 10,
            },
            '@media (min-width: 1000px)': {
              end: 5
            }
          },
        });

        const name = stylex.keyframes({
          from: {
            start: 0,
          },
          to: {
            start: 100,
          }
        });
      `);

      expect(output.metadata).toMatchInlineSnapshot(`
        Object {
          "stylex": Array [
            Array [
              "h3ivgpu3",
              Object {
                "ltr": ".h3ivgpu3{color:red}",
                "rtl": null,
              },
              1,
            ],
            Array [
              "sws6tvwg",
              Object {
                "ltr": ".sws6tvwg{height:5px}",
                "rtl": null,
              },
              1,
            ],
            Array [
              "beji1480",
              Object {
                "ltr": ".beji1480:hover{left:10px}",
                "rtl": ".beji1480:hover{right:10px}",
              },
              8,
            ],
            Array [
              "afainbk7",
              Object {
                "ltr": "@media (min-width: 1000px){.afainbk7.afainbk7{right:5px}}",
                "rtl": "@media (min-width: 1000px){.afainbk7.afainbk7{left:5px}}",
              },
              2,
            ],
            Array [
              "gd0gnj7z-B",
              Object {
                "ltr": "@keyframes gd0gnj7z-B{from{left:0;}to{left:100px;}}",
                "rtl": "@keyframes gd0gnj7z-B{from{right:0;}to{right:100px;}}",
              },
              1,
            ],
          ],
        }
      `);
    });
  });
});
