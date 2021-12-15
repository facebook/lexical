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
   * CSS value normalization
   */

  describe('[transform] CSS value normalization', () => {
    test('normalize whitespace in CSS values', () => {
      expect(
        transform(`
          const styles = stylex.create({
            x: {
              transform: '  rotate(10deg)  translate3d( 0 , 0 , 0 )  '
            }
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".jr0nlbo0{transform:rotate(10deg) translate3d(0,0,0)}\\", 0.1);"',
      );
      expect(
        transform(`
          const styles = stylex.create({ x: { color: 'rgba( 1, 222,  33 , 0.5)' } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".s89qmqjn{color:rgba(1,222,33,.5)}\\", 1);"',
      );
    });

    test('no dimensions for 0 values', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: {
            margin: '0px',
            marginLeft: '1px'
          } });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".m8h3af8h{margin-top:0}\\", 1);
        stylex.inject(\\".l7ghb35v{margin-right:0}\\", 1, \\".l7ghb35v{margin-left:0}\\");
        stylex.inject(\\".kjdc1dyq{margin-bottom:0}\\", 1);
        stylex.inject(\\".kmwttqpk{margin-left:0}\\", 1, \\".kmwttqpk{margin-right:0}\\");
        stylex.inject(\\".l3od1t61{margin-left:1px}\\", 1);"
      `);
    });

    test('0 timings are all "0s"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { transitionDuration: '500ms' } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".gkvswz3s{transition-duration:.5s}\\", 1);"',
      );
    });

    test('0 angles are all "0deg"', () => {
      expect(
        transform(`
          const styles = stylex.create({
            x: { transform: '0rad' },
            y: { transform: '0turn' },
            z: { transform: '0grad' }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".mdt23r3l{transform:0deg}\\", 0.1);
        stylex.inject(\\".mdt23r3l{transform:0deg}\\", 0.1);
        stylex.inject(\\".mdt23r3l{transform:0deg}\\", 0.1);"
      `);
    });

    test('calc() preserves spaces aroung "+" and "-"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { width: 'calc((100% + 3% -   100px) / 7)' } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".dztgb271{width:calc((100% + 3% - 100px) / 7)}\\", 1);"',
      );
    });

    test('strip leading zeros', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: {
            transitionDuration: '0.01s',
            transitionTimingFunction: 'cubic-bezier(.08,.52,.52,1)'
          } });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".bs0c03ma{transition-duration:.01s}\\", 1);
        stylex.inject(\\".lvdmvkcg{transition-timing-function:cubic-bezier(.08,.52,.52,1)}\\", 1);"
      `);
    });

    test('use double quotes in empty strings', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { quotes: "''" } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".prnalohw{quotes:\\\\\\"\\\\\\"}\\", 1);"',
      );
    });

    test('timing values are converted to seconds unless < 10ms', () => {
      expect(
        transform(`
          const styles = stylex.create({
            x: { transitionDuration: '1234ms' },
            y: { transitionDuration: '10ms' },
            z: { transitionDuration: '1ms' }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".ac8p61ak{transition-duration:1.234s}\\", 1);
        stylex.inject(\\".bs0c03ma{transition-duration:.01s}\\", 1);
        stylex.inject(\\".tgkha51v{transition-duration:1ms}\\", 1);"
      `);
    });

    test('transforms non-unitless property values', () => {
      expect(
        transform(`
          const styles = stylex.create({
            normalize: {
              height: 500,
              margin: 10,
              width: 500
            },
            unitless: {
              fontWeight: 500,
              lineHeight: 1.5,
              opacity: 0.5
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".mjo95iq7{height:500px}\\", 1);
        stylex.inject(\\".jenc4j3g{margin-top:10px}\\", 1);
        stylex.inject(\\".mln2r6ah{margin-right:10px}\\", 1, \\".mln2r6ah{margin-left:10px}\\");
        stylex.inject(\\".rbcf3a04{margin-bottom:10px}\\", 1);
        stylex.inject(\\".a60616oh{margin-left:10px}\\", 1, \\".a60616oh{margin-right:10px}\\");
        stylex.inject(\\".imjq5d63{width:500px}\\", 1);
        stylex.inject(\\".tpi2lg9u{font-weight:500}\\", 1);
        stylex.inject(\\".b643thi7{line-height:1.5}\\", 1);
        stylex.inject(\\".mi59tyey{opacity:.5}\\", 1);"
      `);
    });

    test('number values rounded down to four decimal points', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { height: 100 / 3 } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".nomnueuz{height:33.3333px}\\", 1);"',
      );
    });

    test('"content" property values are wrapped in quotes', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              content: '',
            },
            other: {
              content: 'next',
            },
            withQuotes: {
              content: '"prev"',
            }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".axp1y60l{content:\\\\\\"\\\\\\"}\\", 1);
        stylex.inject(\\".k48iq9xp{content:\\\\\\"next\\\\\\"}\\", 1);
        stylex.inject(\\".jjrsgf30{content:\\\\\\"prev\\\\\\"}\\", 1);"
      `);
    });

    test('[legacy] transforms font size from px to rem', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              fontSize: '24px',
            },
            bar: {
              fontSize: 18,
            },
            baz: {
              fontSize: '1.25rem',
            },
            qux: {
              fontSize: 'inherit',
            }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".qntmu8s7{font-size:1.5rem}\\", 1);
        stylex.inject(\\".rxmdf5ve{font-size:1.125rem}\\", 1);
        stylex.inject(\\".rq8durfe{font-size:1.25rem}\\", 1);
        stylex.inject(\\".jwegzro5{font-size:inherit}\\", 1);"
      `);
    });

    test('[legacy] no space before "!important"', () => {
      expect(
        transform(`
          const styles = stylex.create({ x: { color: 'red !important' } });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".fg1v9vue{color:red!important}\\", 1);"',
      );
    });
  });
});
