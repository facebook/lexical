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
  /**
   * CSS logical values transform
   */

  describe('[transform] CSS logical values', () => {
    // TODO: Add support for 'background-position-x: x-start' logical values
    // once spec stabilizes.
    // https://drafts.csswg.org/css-backgrounds-4/#the-background-position

    test('value "inline-end" for "clear" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { clear: 'inline-end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".kltbegn6{clear:inline-end}\\", 1);
        const styles = {
          x: {
            clear: \\"kltbegn6\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('value "inline-start" for "clear" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { clear: 'inline-start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pa2xmp8h{clear:inline-start}\\", 1);
        const styles = {
          x: {
            clear: \\"pa2xmp8h\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('value "inline-end" for "float" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { float: 'inline-end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".hirfcnyf{float:inline-end}\\", 1);
        const styles = {
          x: {
            float: \\"hirfcnyf\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('value "inline-start" for "float" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { float: 'inline-start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".azb01riz{float:inline-start}\\", 1);
        const styles = {
          x: {
            float: \\"azb01riz\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('value "end" for "textAlign" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { textAlign: 'end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".tc5ow3dt{text-align:right}\\", 1, \\".tc5ow3dt{text-align:left}\\");
        const styles = {
          x: {
            textAlign: \\"tc5ow3dt\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('value "start" for "textAlign" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { textAlign: 'start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ztn2w49o{text-align:left}\\", 1, \\".ztn2w49o{text-align:right}\\");
        const styles = {
          x: {
            textAlign: \\"ztn2w49o\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /**
     * Non-standard values
     */

    test('[non-standard] value "end" (aka "inlineEnd") for "clear" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { clear: 'end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".s9dazmfr{clear:end}\\", 1);
        const styles = {
          x: {
            clear: \\"s9dazmfr\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] value "start" (aka "inlineStart") for "clear" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { clear: 'start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".kk81wrcj{clear:start}\\", 1);
        const styles = {
          x: {
            clear: \\"kk81wrcj\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] value "end" (aka "inlineEnd") for "float" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { float: 'end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".te3vojn2{float:right}\\", 1, \\".te3vojn2{float:left}\\");
        const styles = {
          x: {
            float: \\"te3vojn2\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] value "start" (aka "inlineStart") for "float" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { float: 'start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".o3hwc0lp{float:left}\\", 1, \\".o3hwc0lp{float:right}\\");
        const styles = {
          x: {
            float: \\"o3hwc0lp\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /**
     * Non-standard bidi transforms
     */

    test('[legacy] value "e-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'e-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".husdjfav{cursor:e-resize}\\", 1, \\".husdjfav{cursor:w-resize}\\");
        const styles = {
          x: {
            cursor: \\"husdjfav\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value "w-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'w-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".o1w28hdy{cursor:w-resize}\\", 1, \\".o1w28hdy{cursor:e-resize}\\");
        const styles = {
          x: {
            cursor: \\"o1w28hdy\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value "ne-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'ne-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".thcgyxst{cursor:ne-resize}\\", 1, \\".thcgyxst{cursor:nw-resize}\\");
        const styles = {
          x: {
            cursor: \\"thcgyxst\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value "nw-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'nw-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".se3b0lb6{cursor:nw-resize}\\", 1, \\".se3b0lb6{cursor:ne-resize}\\");
        const styles = {
          x: {
            cursor: \\"se3b0lb6\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value "se-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'se-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".i6ye6ah6{cursor:se-resize}\\", 1, \\".i6ye6ah6{cursor:sw-resize}\\");
        const styles = {
          x: {
            cursor: \\"i6ye6ah6\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value "sw-resize" for "cursor" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { cursor: 'sw-resize' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".c1bmwnla{cursor:sw-resize}\\", 1, \\".c1bmwnla{cursor:se-resize}\\");
        const styles = {
          x: {
            cursor: \\"c1bmwnla\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /**
     * Legacy transforms
     * TODO(#33): Remove once support for multi-sided values is removed from shortforms.
     */

    test('[legacy] value of "animationName" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { animationName: 'ignore' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".lh7cov9c{animation-name:ignore-ltr}\\", 1, \\".lh7cov9c{animation-name:ignore-rtl}\\");
        const styles = {
          x: {
            animationName: \\"lh7cov9c\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value of "backgroundPosition" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { backgroundPosition: 'top end' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".lt9wx0ow{background-position:top right}\\", 1, \\".lt9wx0ow{background-position:top left}\\");
        const styles = {
          x: {
            backgroundPosition: \\"lt9wx0ow\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { backgroundPosition: 'top start' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".s0cjhsjb{background-position:top left}\\", 1, \\".s0cjhsjb{background-position:top right}\\");
        const styles = {
          x: {
            backgroundPosition: \\"s0cjhsjb\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value of "boxShadow" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: 'none' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".rcrnfkcx{box-shadow:none}\\", 1);
        const styles = {
          x: {
            boxShadow: \\"rcrnfkcx\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: '1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pca5mu2i{box-shadow:1px 1px #000}\\", 1, \\".pca5mu2i{box-shadow:-1px 1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"pca5mu2i\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: '-1px -1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".r9nnlcia{box-shadow:-1px -1px #000}\\", 1, \\".r9nnlcia{box-shadow:1px -1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"r9nnlcia\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: 'inset 1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".qak1umvh{box-shadow:inset 1px 1px #000}\\", 1, \\".qak1umvh{box-shadow:inset -1px 1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"qak1umvh\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: '1px 1px 1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".aeec2zqu{box-shadow:1px 1px 1px 1px #000}\\", 1, \\".aeec2zqu{box-shadow:-1px 1px 1px 1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"aeec2zqu\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: 'inset 1px 1px 1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".t05h7uc7{box-shadow:inset 1px 1px 1px 1px #000}\\", 1, \\".t05h7uc7{box-shadow:inset -1px 1px 1px 1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"t05h7uc7\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { boxShadow: '2px 2px 2px 2px red, inset 1px 1px 1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".a4jldh8c{box-shadow:2px 2px 2px 2px red,inset 1px 1px 1px 1px #000}\\", 1, \\".a4jldh8c{box-shadow:-2px 2px 2px 2px red, inset -1px 1px 1px 1px #000}\\");
        const styles = {
          x: {
            boxShadow: \\"a4jldh8c\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[legacy] value of "textShadow" property', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { textShadow: 'none' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".qut4rykw{text-shadow:none}\\", 1);
        const styles = {
          x: {
            textShadow: \\"qut4rykw\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { textShadow: '1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".g0syhr9o{text-shadow:1px 1px #000}\\", 1, \\".g0syhr9o{text-shadow:-1px 1px #000}\\");
        const styles = {
          x: {
            textShadow: \\"g0syhr9o\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { textShadow: '-1px -1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".t0jufkno{text-shadow:-1px -1px #000}\\", 1, \\".t0jufkno{text-shadow:1px -1px #000}\\");
        const styles = {
          x: {
            textShadow: \\"t0jufkno\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
      expect(
        transform(`
          const styles = stylex.create({ x: { textShadow: '1px 1px 1px #000' } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".rlnwwpst{text-shadow:1px 1px 1px #000}\\", 1, \\".rlnwwpst{text-shadow:-1px 1px 1px #000}\\");
        const styles = {
          x: {
            textShadow: \\"rlnwwpst\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });
  });
});
