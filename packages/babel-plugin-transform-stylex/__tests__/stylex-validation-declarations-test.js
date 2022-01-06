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

describe.skip('babel-plugin-transform-stylex', () => {
  /**
   * Various shortform properties are disallowed to simplify the way properties are merged.
   */
  describe('[validation] stylex invalid properties', () => {
    const borderValue = '1px solid red';
    const invalidPropertyDeclarations = [
      ['animation', 'anim 1s'],
      ['background', 'red'],
      ['border', borderValue],
      ['borderBlock', borderValue],
      ['borderBlockEnd', borderValue],
      ['borderBlockStart', borderValue],
      ['borderBottom', borderValue],
      ['borderImage', 'url(./img.jpg) 30 space'],
      ['borderInline', borderValue],
      ['borderInlineEnd', borderValue],
      ['borderInlineStart', borderValue],
      ['borderLeft', borderValue],
      ['borderRight', borderValue],
      ['borderTop', borderValue],
      ['flexFlow', 'row wrap'],
      ['font', '16px/16 Arial'],
      ['listStyle', 'square inside'],
      ['textDecoration', '1px solid underline'],
      ['transition', 'opacity 1s'],
    ];

    invalidPropertyDeclarations.forEach(([prop, value]) => {
      test(`invalid property: "${prop}"`, () => {
        expect(() => {
          transform(`
            const styles = stylex.create({ x: { ${prop}: "${value}" } });
          `);
        }).toThrow(messages.UNKNOWN_PROP_KEY);
      });
    });
  });

  describe('[validation] stylex invalid property values', () => {
    const multiLength = '1px 2px';

    const invalidShortformValueDeclarations = [
      ['backgroundPosition', 'top left'],
      ['borderColor', 'red blue'],
      ['borderRadius', multiLength],
      ['borderStyle', 'solid dashed'],
      ['borderWidth', multiLength],
      ['inset', multiLength],
      ['insetBlock', multiLength],
      ['insetInline', multiLength],
      ['flex', '1 1 0'],
      ['grid', '1 1 0'],
      ['margin', multiLength],
      ['marginBlock', multiLength],
      ['marginInline', multiLength],
      ['lexical', '1px solid red'],
      ['overflow', 'hidden visible'],
      ['padding', multiLength],
      ['paddingBlock', multiLength],
      ['paddingInline', multiLength],
    ];

    const invalidTransitionPropertyValueDeclarations = [
      'all',
      'bottom',
      'end',
      'height',
      'inset',
      'inset-block',
      'inset-inline',
      'inset-block-end',
      'inset-block-start',
      'inset-inline-end',
      'inset-inline-start',
      'margin',
      'left',
      'padding',
      'right',
      'start',
      'top',
      'width',
    ].map((value) => ['transitionProperty', value]);

    [
      // No !important
      ['display', 'block !important'],
      // No multi-value short-forms
      ...invalidShortformValueDeclarations,
      // No CPU intensive property transitions
      ...invalidTransitionPropertyValueDeclarations,
    ].forEach(([prop, value]) => {
      test(`invalid value: "${value}" for "${prop}"`, () => {
        expect(() => {
          transform(`
            const styles = stylex.create({ x: { ${prop}: "${value}" } });
          `);
        }).toThrow(messages.ILLEGAL_PROP_VALUE);
      });
    });
  });
});
