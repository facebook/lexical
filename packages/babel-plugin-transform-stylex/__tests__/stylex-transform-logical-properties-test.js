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
   * CSS logical properties transform
   */

  describe('[transform] CSS logical properties', () => {
    /* Border colors */

    test('"borderBlockColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".glsht0ft{border-block-color:0}\\", 1);
        const styles = {
          x: {
            borderBlockColor: \\"glsht0ft\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockStartColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockStartColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".hp5zipul{border-block-start-color:0}\\", 1);
        const styles = {
          x: {
            borderBlockStartColor: \\"hp5zipul\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockEndColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockEndColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".kjhe5e47{border-block-end-color:0}\\", 1);
        const styles = {
          x: {
            borderBlockEndColor: \\"kjhe5e47\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ms3ud69g{border-inline-color:0}\\", 1);
        const styles = {
          x: {
            borderInlineColor: \\"ms3ud69g\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineStartColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineStartColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".t9ih75qz{border-inline-start-color:0}\\", 1);
        const styles = {
          x: {
            borderInlineStartColor: \\"t9ih75qz\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineEndColor"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineEndColor: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".mzepkvk3{border-inline-end-color:0}\\", 1);
        const styles = {
          x: {
            borderInlineEndColor: \\"mzepkvk3\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /* Border styles */

    test('"borderBlockStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ddzv1qv3{border-block-style:0}\\", 1);
        const styles = {
          x: {
            borderBlockStyle: \\"ddzv1qv3\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockStartStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockStartStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ch8vs2nf{border-block-start-style:0}\\", 1);
        const styles = {
          x: {
            borderBlockStartStyle: \\"ch8vs2nf\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockEndStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockEndStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".etsnurg8{border-block-end-style:0}\\", 1);
        const styles = {
          x: {
            borderBlockEndStyle: \\"etsnurg8\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".nghdtlmc{border-inline-style:0}\\", 1);
        const styles = {
          x: {
            borderInlineStyle: \\"nghdtlmc\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineStartStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineStartStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".fj6i00d8{border-inline-start-style:0}\\", 1);
        const styles = {
          x: {
            borderInlineStartStyle: \\"fj6i00d8\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineEndStyle"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineEndStyle: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".co99ylq0{border-inline-end-style:0}\\", 1);
        const styles = {
          x: {
            borderInlineEndStyle: \\"co99ylq0\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /* Border widths */

    test('"borderBlockWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".fyjzgvbd{border-block-width:0}\\", 1);
        const styles = {
          x: {
            borderBlockWidth: \\"fyjzgvbd\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockStartWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockStartWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".bjyoi13i{border-block-start-width:0}\\", 1);
        const styles = {
          x: {
            borderBlockStartWidth: \\"bjyoi13i\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderBlockEndWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderBlockEndWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ji2lh6yc{border-block-end-width:0}\\", 1);
        const styles = {
          x: {
            borderBlockEndWidth: \\"ji2lh6yc\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".jdmse54s{border-inline-width:0}\\", 1);
        const styles = {
          x: {
            borderInlineWidth: \\"jdmse54s\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineStartWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineStartWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".treqeyay{border-inline-start-width:0}\\", 1);
        const styles = {
          x: {
            borderInlineStartWidth: \\"treqeyay\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"borderInlineEndWidth"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { borderInlineEndWidth: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".outacnph{border-inline-end-width:0}\\", 1);
        const styles = {
          x: {
            borderInlineEndWidth: \\"outacnph\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /* Position offsets */

    test('"insetBlockStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetBlockStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".dai7na9b{inset-block-start:0}\\", 1);
        const styles = {
          x: {
            insetBlockStart: \\"dai7na9b\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetBlock"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetBlock: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".mhcligdx{inset-block:0}\\", 1);
        const styles = {
          x: {
            insetBlock: \\"mhcligdx\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetBlockEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetBlockEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".t7tiwqrj{inset-block-end:0}\\", 1);
        const styles = {
          x: {
            insetBlockEnd: \\"t7tiwqrj\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetBlockStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetBlockStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".dai7na9b{inset-block-start:0}\\", 1);
        const styles = {
          x: {
            insetBlockStart: \\"dai7na9b\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetInline"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetInline: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".r4rsox6c{inset-inline:0}\\", 1);
        const styles = {
          x: {
            insetInline: \\"r4rsox6c\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetInlineEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetInlineEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".p5dzx4u7{inset-inline-end:0}\\", 1);
        const styles = {
          x: {
            insetInlineEnd: \\"p5dzx4u7\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"insetInlineStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { insetInlineStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".picngouf{inset-inline-start:0}\\", 1);
        const styles = {
          x: {
            insetInlineStart: \\"picngouf\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /* Margins */

    test('"marginBlock"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginBlock: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".n8vtft0c{margin-block:0}\\", 1);
        const styles = {
          x: {
            marginBlock: \\"n8vtft0c\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"marginBlockEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginBlockEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".a3sutblb{margin-block-end:0}\\", 1);
        const styles = {
          x: {
            marginBlockEnd: \\"a3sutblb\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"marginBlockStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginBlockStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".cry48jto{margin-block-start:0}\\", 1);
        const styles = {
          x: {
            marginBlockStart: \\"cry48jto\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"marginInline"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginInline: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".jmrexof9{margin-inline:0}\\", 1);
        const styles = {
          x: {
            marginInline: \\"jmrexof9\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"marginInlineEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginInlineEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h6esja58{margin-inline-end:0}\\", 1);
        const styles = {
          x: {
            marginInlineEnd: \\"h6esja58\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"marginInlineStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginInlineStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".s6tsv53s{margin-inline-start:0}\\", 1);
        const styles = {
          x: {
            marginInlineStart: \\"s6tsv53s\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /* Padding */

    test('"paddingBlock"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingBlock: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".p7sxz1ka{padding-block:0}\\", 1);
        const styles = {
          x: {
            paddingBlock: \\"p7sxz1ka\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"paddingBlockEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingBlockEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".icnti0gi{padding-block-end:0}\\", 1);
        const styles = {
          x: {
            paddingBlockEnd: \\"icnti0gi\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"paddingBlockStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingBlockStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".tqpwkkoj{padding-block-start:0}\\", 1);
        const styles = {
          x: {
            paddingBlockStart: \\"tqpwkkoj\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"paddingInline"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingInline: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".awlblqoi{padding-inline:0}\\", 1);
        const styles = {
          x: {
            paddingInline: \\"awlblqoi\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"paddingInlineEnd"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingInlineEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ojw254q4{padding-inline-end:0}\\", 1);
        const styles = {
          x: {
            paddingInlineEnd: \\"ojw254q4\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('"paddingInlineStart"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingInlineStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".erqt9x5n{padding-inline-start:0}\\", 1);
        const styles = {
          x: {
            paddingInlineStart: \\"erqt9x5n\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /**
     * Non-standard properties
     */

    test('[non-standard] "end" (aka "insetInlineEnd")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { end: 5 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pdnn0v0e{right:5px}\\", 1, \\".pdnn0v0e{left:5px}\\");
        const styles = {
          x: {
            end: \\"pdnn0v0e\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "marginEnd" (aka "marginInlineEnd")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".l7ghb35v{margin-right:0}\\", 1, \\".l7ghb35v{margin-left:0}\\");
        const styles = {
          x: {
            marginEnd: \\"l7ghb35v\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "marginHorizontal" (aka "marginInline")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginHorizontal: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".l7ghb35v{margin-right:0}\\", 1, \\".l7ghb35v{margin-left:0}\\");
        stylex.inject(\\".kmwttqpk{margin-left:0}\\", 1, \\".kmwttqpk{margin-right:0}\\");
        const styles = {
          x: {
            marginEnd: \\"l7ghb35v\\",
            marginStart: \\"kmwttqpk\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "marginStart" (aka "marginInlineStart")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".kmwttqpk{margin-left:0}\\", 1, \\".kmwttqpk{margin-right:0}\\");
        const styles = {
          x: {
            marginStart: \\"kmwttqpk\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "marginVertical" (aka "marginBlock")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { marginVertical: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".m8h3af8h{margin-top:0}\\", 1);
        stylex.inject(\\".kjdc1dyq{margin-bottom:0}\\", 1);
        const styles = {
          x: {
            marginTop: \\"m8h3af8h\\",
            marginBottom: \\"kjdc1dyq\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "paddingEnd" (aka "paddingInlineEnd")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingEnd: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".oxkhqvkx{padding-right:0}\\", 1, \\".oxkhqvkx{padding-left:0}\\");
        const styles = {
          x: {
            paddingEnd: \\"oxkhqvkx\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "paddingHorizontal" (aka "paddingInline")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingHorizontal: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".oxkhqvkx{padding-right:0}\\", 1, \\".oxkhqvkx{padding-left:0}\\");
        stylex.inject(\\".nch0832m{padding-left:0}\\", 1, \\".nch0832m{padding-right:0}\\");
        const styles = {
          x: {
            paddingEnd: \\"oxkhqvkx\\",
            paddingStart: \\"nch0832m\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "paddingStart" (aka "paddingInlineStart")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingStart: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".nch0832m{padding-left:0}\\", 1, \\".nch0832m{padding-right:0}\\");
        const styles = {
          x: {
            paddingStart: \\"nch0832m\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "paddingVertical" (aka "paddingBlock")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { paddingVertical: 0 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".srn514ro{padding-top:0}\\", 1);
        stylex.inject(\\".rl78xhln{padding-bottom:0}\\", 1);
        const styles = {
          x: {
            paddingTop: \\"srn514ro\\",
            paddingBottom: \\"rl78xhln\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    test('[non-standard] "start" (aka "insetInlineStart")', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { start: 5 } });
          const classnames = stylex(styles.x);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".c4a4i8yc{left:5px}\\", 1, \\".c4a4i8yc{right:5px}\\");
        const styles = {
          x: {
            start: \\"c4a4i8yc\\"
          }
        };
        const classnames = stylex(styles.x);"
      `);
    });

    /**
     * Legacy transforms
     */

    test('[legacy] short-form property value flipping', () => {
      expect(
        transform(`
          const styles = stylex.create({
            four: {
              margin: '1 2 3 4',
            }
          });
          stylex(styles.four);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".mr4w5f57{margin-top:1}\\", 1);
        stylex.inject(\\".fowiaccw{margin-right:2}\\", 1, \\".fowiaccw{margin-left:2}\\");
        stylex.inject(\\".iqsy6m2w{margin-bottom:3}\\", 1);
        stylex.inject(\\".pz2itsrw{margin-left:4}\\", 1, \\".pz2itsrw{margin-right:4}\\");
        \\"pz2itsrw iqsy6m2w fowiaccw mr4w5f57\\";"
      `);
    });
  });
});
