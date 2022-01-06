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
  describe('[transform] CSS keyframes', () => {
    test('converts keyframes to CSS', () => {
      expect(
        transform(`
          const name = stylex.keyframes({
            from: {
              backgroundColor: 'red',
            },

            to: {
              backgroundColor: 'blue',
            }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\"@keyframes ptsi9t9a-B{from{background-color:red;}to{background-color:blue;}}\\", 1);
        const name = \\"ptsi9t9a-B\\";"
      `);
    });

    test('allows template literal references to keyframes', () => {
      expect(
        transform(`
          const name = stylex.keyframes({
            from: {
              backgroundColor: 'blue',
            },
            to: {
              backgroundColor: 'red',
            },
          });

          const styles = stylex.create({
            default: {
              animation: \`3s \${name}\`,
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\"@keyframes lz712mjz-B{from{background-color:blue;}to{background-color:red;}}\\", 1);
        const name = \\"lz712mjz-B\\";
        stylex.inject(\\".qna8o59p{animation:3s lz712mjz-B}\\", 0.1);"
      `);
    });

    test('generates RTL-specific keyframes', () => {
      expect(
        transform(`
          const name = stylex.keyframes({
            from: {
              start: 0,
            },

            to: {
              start: 500,
            },
          });

          const styles = stylex.create({
            root: {
              animationName: name,
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\"@keyframes h768rhe7-B{from{left:0;}to{left:500px;}}\\", 1, \\"@keyframes h768rhe7-B{from{right:0;}to{right:500px;}}\\");
        const name = \\"h768rhe7-B\\";
        stylex.inject(\\".i3ugh2qu{animation-name:h768rhe7-B}\\", 1);"
      `);
    });
  });
});
