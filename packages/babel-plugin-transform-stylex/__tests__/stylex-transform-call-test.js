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
  describe('[transform] stylex() call', () => {
    test('empty stylex call', () => {
      expect(
        transform(`
          stylex();
        `),
      ).toMatchInlineSnapshot('"\\"\\";"');
    });

    test('basic stylex call', () => {
      expect(
        transform(`
          const styles = stylex.create({
            red: {
              color: 'red',
            }
          });
          stylex(styles.red);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        \\"h3ivgpu3\\";"
      `);
    });

    test('stylex call with number', () => {
      expect(
        transform(`
          const styles = stylex.create({
            0: {
              color: 'red',
            },
            1: {
              backgroundColor: 'blue',
            }
          });
          stylex(styles[0], styles[1]);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
        \\"h3ivgpu3 n6f2byep\\";"
      `);
    });

    test('stylex call with computed number', () => {
      expect(
        transform(`
          const styles = stylex.create({
            [0]: {
              color: 'red',
            },
            [1]: {
              backgroundColor: 'blue',
            }
          });
          stylex(styles[0], styles[1]);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
        \\"h3ivgpu3 n6f2byep\\";"
      `);
    });

    test('stylex call with computed string', () => {
      expect(
        transform(`
          const styles = stylex.create({
            'default': {
              color: 'red',
            }
          });
          stylex(styles['default']);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        \\"h3ivgpu3\\";"
      `);
    });

    test('stylex call with computed key access', () => {
      expect(
        transform(`
          const styles = stylex.create({
            [0]: {
              color: 'red',
            },
            [1]: {
              backgroundColor: 'blue',
            }
          });
          stylex(styles[variant]);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
        const styles = {
          [0]: {
            color: \\"h3ivgpu3\\"
          },
          [1]: {
            backgroundColor: \\"n6f2byep\\"
          }
        };
        stylex(styles[variant]);"
      `);
    });

    test('stylex call with multiple namespaces', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              color: 'red',
            },
          });
          const otherStyles = stylex.create({
            default: {
              backgroundColor: 'blue',
            }
          });
          stylex(styles.default, otherStyles.default);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
        \\"h3ivgpu3 n6f2byep\\";"
      `);
    });

    test('stylex call within variable declarations', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: { color: 'red' }
          });
          const a = function() {
            return stylex(styles.foo);
          }
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);

        const a = function () {
          return \\"h3ivgpu3\\";
        };"
      `);
    });

    test('stylex call with styles variable assignment', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              color: 'red',
            },
            bar: {
              backgroundColor: 'blue',
            }
          });
          stylex(styles.foo, styles.bar);
          const foo = styles;
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
        const styles = {
          foo: {
            color: \\"h3ivgpu3\\"
          },
          bar: {
            backgroundColor: \\"n6f2byep\\"
          }
        };
        stylex(styles.foo, styles.bar);
        const foo = styles;"
      `);
    });

    test('stylex call within export declarations', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: { color: 'red' }
          });
          export default function MyExportDefault() {
            return stylex(styles.foo);
          }
          export function MyExport() {
            return stylex(styles.foo);
          }
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        export default function MyExportDefault() {
          return \\"h3ivgpu3\\";
        }
        export function MyExport() {
          return \\"h3ivgpu3\\";
        }"
      `);
    });

    test('stylex call with short-form properties', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              padding: 5
            }
          });
          stylex(styles.foo);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
        stylex.inject(\\".p4n9ro91{padding-right:5px}\\", 1, \\".p4n9ro91{padding-left:5px}\\");
        stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
        stylex.inject(\\".t4os9e1m{padding-left:5px}\\", 1, \\".t4os9e1m{padding-right:5px}\\");
        \\"t4os9e1m onux6t7x p4n9ro91 d1v569po\\";"
      `);
    });

    test('stylex call with exported short-form properties', () => {
      expect(
        transform(`
          export const styles = stylex.create({
            foo: {
              padding: 5
            }
          });
          stylex(styles.foo);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
        stylex.inject(\\".p4n9ro91{padding-right:5px}\\", 1, \\".p4n9ro91{padding-left:5px}\\");
        stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
        stylex.inject(\\".t4os9e1m{padding-left:5px}\\", 1, \\".t4os9e1m{padding-right:5px}\\");
        export const styles = {
          foo: {
            paddingTop: \\"d1v569po\\",
            paddingEnd: \\"p4n9ro91\\",
            paddingBottom: \\"onux6t7x\\",
            paddingStart: \\"t4os9e1m\\"
          }
        };
        stylex(styles.foo);"
      `);
    });

    test('stylex call using styles with pseudo selectors', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              color: 'red',
              ':hover': {
                color: 'blue',
              }
            }
          });
          stylex(styles.default);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);
        \\"dvoqa86r h3ivgpu3\\";"
      `);
    });

    test('stylex call using styles with Media Queries', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              backgroundColor: 'red',
              '@media (min-width: 1000px)': {
                backgroundColor: 'blue',
              },
              '@media (min-width: 2000px)': {
                backgroundColor: 'purple',
              },
            },
          });
          stylex(styles.default);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
        stylex.inject(\\"@media (min-width: 1000px){.psrm59q7.psrm59q7{background-color:blue}}\\", 2);
        stylex.inject(\\"@media (min-width: 2000px){.bi4461le.bi4461le{background-color:purple}}\\", 2);
        \\"bi4461le psrm59q7 gyzkc3zm\\";"
      `);
    });

    test('stylex call using styles with Support Queries', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              backgroundColor: 'red',
              '@supports (hover: hover)': {
                backgroundColor: 'blue',
              },
              '@supports not (hover: hover)': {
                backgroundColor: 'purple',
              },
            },
          });
          stylex(styles.default);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
        stylex.inject(\\"@supports (hover: hover){.s3zv1jgm.s3zv1jgm{background-color:blue}}\\", 2);
        stylex.inject(\\"@supports not (hover: hover){.btbcoxja.btbcoxja{background-color:purple}}\\", 2);
        \\"btbcoxja s3zv1jgm gyzkc3zm\\";"
      `);
    });

    test('stylex call using exported styles with pseudo selectors, and queries', () => {
      expect(
        transform(`
          export const styles = stylex.create({
            default: {
              ':hover': {
                color: 'blue',
              },
              '@media (min-width: 1000px)': {
                backgroundColor: 'blue',
              },
            }
          });
          stylex(styles.default);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);
        stylex.inject(\\"@media (min-width: 1000px){.psrm59q7.psrm59q7{background-color:blue}}\\", 2);
        export const styles = {
          default: {
            ':hover': {
              color: \\"dvoqa86r\\"
            },
            '@media (min-width: 1000px)': {
              backgroundColor: \\"psrm59q7\\"
            }
          }
        };
        stylex(styles.default);"
      `);
    });

    // CONDITIONS AND COLLISIONS

    test('stylex call with conditions', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              backgroundColor: 'red',
            },
            active: {
              color: 'blue',
            }
          });
          stylex(styles.default, isActive && styles.active);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
        stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
        \\"gyzkc3zm\\" + (isActive ? \\" y6ups3dp\\" : \\"\\");"
      `);
    });

    test('stylex call with property collisions', () => {
      expect(
        transform(`
          const styles = stylex.create({
            red: {
              color: 'red',
            },
            blue: {
              color: 'blue',
            }
          });
          stylex(styles.red, styles.blue);
          stylex(styles.blue, styles.red);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
        \\"y6ups3dp\\";
        \\"h3ivgpu3\\";"
      `);
    });

    test('stylex call with short-form property collisions', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              padding: 5,
              paddingEnd: 10,
            },

            bar: {
              padding: 2,
              paddingStart: 10,
            },
          });
          stylex(styles.foo, styles.bar);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
        stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
        stylex.inject(\\".t4os9e1m{padding-left:5px}\\", 1, \\".t4os9e1m{padding-right:5px}\\");
        stylex.inject(\\".ejhi0i36{padding-right:10px}\\", 1, \\".ejhi0i36{padding-left:10px}\\");
        stylex.inject(\\".ngbj85sm{padding-top:2px}\\", 1);
        stylex.inject(\\".pdnn8mpk{padding-right:2px}\\", 1, \\".pdnn8mpk{padding-left:2px}\\");
        stylex.inject(\\".rt9i6ysf{padding-bottom:2px}\\", 1);
        stylex.inject(\\".qbvjirod{padding-left:10px}\\", 1, \\".qbvjirod{padding-right:10px}\\");
        \\"qbvjirod rt9i6ysf pdnn8mpk ngbj85sm\\";"
      `);
    });

    test('stylex call with conditions and collisions', () => {
      expect(
        transform(`
          const styles = stylex.create({
            red: {
              color: 'red',
            },
            blue: {
              color: 'blue',
            }
          });
          stylex(styles.red, isActive && styles.blue);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
        stylex.dedupe({
          \\"color-1\\": \\"h3ivgpu3\\"
        }, isActive ? {
          \\"color-1\\": \\"y6ups3dp\\"
        } : null);"
      `);
    });

    // COMPOSITION

    test('stylex call with composition of external styles', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              color: 'red',
            },
          });
          stylex(styles.default, props);
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
        const styles = {
          default: {
            color: \\"h3ivgpu3\\"
          }
        };
        stylex(styles.default, props);"
      `);
    });

    describe('with plugin options', () => {
      test('stylex call produces dev class names', () => {
        const options = {
          filename: 'html/js/FooBar.react.js',
          dev: true,
        };
        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                color: 'red',
              },
            });
            stylex(styles.default);
        `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          \\"FooBar__styles.default h3ivgpu3\\";"
        `);
      });

      test('stylex call produces dev class name with conditions', () => {
        const options = {
          filename: 'html/js/FooBar.react.js',
          dev: true,
        };
        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                color: 'red',
              },
            });
            const otherStyles = stylex.create({
              default: {
                backgroundColor: 'blue',
              }
            });
            stylex(styles.default, isActive && otherStyles.default);
        `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"FooBar__styles.default h3ivgpu3\\" + (isActive ? \\" FooBar__otherStyles.default n6f2byep\\" : \\"\\");"
        `);
      });

      test('stylex call produces dev class name with collisions', () => {
        const options = {
          filename: 'html/js/FooBar.react.js',
          dev: true,
        };

        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              active: {
                color: 'blue',
              }
            });
            stylex(styles.default, isActive && styles.active);
        `,
            options,
          ),
        ).toMatchInlineSnapshot(`
            "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
            stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
            stylex.dedupe({
              \\"FooBar__styles.default\\": \\"FooBar__styles.default\\",
              \\"color-1\\": \\"h3ivgpu3\\"
            }, isActive ? {
              \\"FooBar__styles.active\\": \\"FooBar__styles.active\\",
              \\"color-1\\": \\"y6ups3dp\\"
            } : null);"
        `);
      });
    });
  });
});
