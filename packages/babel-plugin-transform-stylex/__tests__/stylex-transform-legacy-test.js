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
   * Legacy API
   */

  describe('[transform] legacy API', () => {
    describe('styles("foo")', () => {
      test('transforms plain stylex value call with strings', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              default2: {
                backgroundColor: 'blue',
              }
            });
            styles('default', 'default2');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"h3ivgpu3 n6f2byep\\";"
        `);
      });

      test('transforms plain stylex value call with numbers', () => {
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
            styles(0, 1);
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"h3ivgpu3 n6f2byep\\";"
        `);
      });

      test('transforms plain stylex value call with computed numbers', () => {
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
            styles(0, 1);
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"h3ivgpu3 n6f2byep\\";"
        `);
      });

      test('triggers composition when values are exported', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              default2: {
                backgroundColor: 'blue',
              }
            });
            styles('default', props && 'default2');
            const foo = styles;
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          const styles = {
            default: {
              color: \\"h3ivgpu3\\"
            },
            default2: {
              backgroundColor: \\"n6f2byep\\"
            }
          };
          stylex(styles.default, props && styles.default2);
          const foo = styles;"
        `);
      });

      test('transforms plain stylex value call with strings containing collisions', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                backgroundColor: 'red',
              },
              default2: {
                backgroundColor: 'blue',
              }
            });
            styles('default', 'default2');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"n6f2byep\\";"
        `);
      });

      test('transforms plain stylex value call with conditions', () => {
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
            styles('default', isActive && 'active');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
          \\"gyzkc3zm\\" + (isActive ? \\" y6ups3dp\\" : \\"\\");"
        `);
      });

      test('transforms plain stylex value call with a map of conditions', () => {
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
            styles({
              default: true,
              active: isActive,
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
          \\"gyzkc3zm\\" + (isActive ? \\" y6ups3dp\\" : \\"\\");"
        `);
      });

      test('transforms plain stylex value call with a map of colliding conditions', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              active: {
                color: 'blue',
              }
            });
            styles({
              default: true,
              active: isActive,
            });
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

      test('ensure pseudo selector and base namespace styles are applied', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'blue',
                ':hover': {
                  backgroundColor: 'red',
                }
              }
            });
            styles('default');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
          stylex.inject(\\".pbqw5nlk:hover{background-color:red}\\", 8);
          \\"pbqw5nlk y6ups3dp\\";"
        `);
      });

      test('correctly remove shadowed properties when using no conditions', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                padding: 5,
              },

              bar: {
                padding: 2,
                paddingStart: 10,
              },
            });
            styles('bar', 'foo');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
          stylex.inject(\\".p4n9ro91{padding-right:5px}\\", 1, \\".p4n9ro91{padding-left:5px}\\");
          stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
          stylex.inject(\\".t4os9e1m{padding-left:5px}\\", 1, \\".t4os9e1m{padding-right:5px}\\");
          stylex.inject(\\".ngbj85sm{padding-top:2px}\\", 1);
          stylex.inject(\\".pdnn8mpk{padding-right:2px}\\", 1, \\".pdnn8mpk{padding-left:2px}\\");
          stylex.inject(\\".rt9i6ysf{padding-bottom:2px}\\", 1);
          stylex.inject(\\".qbvjirod{padding-left:10px}\\", 1, \\".qbvjirod{padding-right:10px}\\");
          \\"t4os9e1m onux6t7x p4n9ro91 d1v569po\\";"
        `);
      });

      test('correctly remove shadowed properties when using no conditions with shadowed namespace styles', () => {
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
            styles('bar', 'foo');
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
          \\"ejhi0i36 t4os9e1m onux6t7x d1v569po\\";"
        `);
      });

      test('transforms styles usage before declaration', () => {
        expect(
          transform(`
            function Component() {
              styles('default');
            }

            const styles = stylex.create({
              default: {
                color: 'red',
              },
            });
          `),
        ).toMatchInlineSnapshot(`
          "function Component() {
            \\"h3ivgpu3\\";
          }

          stylex.inject(\\".h3ivgpu3{color:red}\\", 1);"
        `);
      });

      test('auto-expands borderRadius shorthand', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                borderRadius: '8px 8px 0 0',
              },
              withCalc: {
                borderRadius: '8px 8px calc(100% - 2px) 0',
              }
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h8391g91{border-top-left-radius:8px}\\", 1, \\".h8391g91{border-top-right-radius:8px}\\");
          stylex.inject(\\".m0cukt09{border-top-right-radius:8px}\\", 1, \\".m0cukt09{border-top-left-radius:8px}\\");
          stylex.inject(\\".nfcwbgbd{border-bottom-right-radius:0}\\", 1, \\".nfcwbgbd{border-bottom-left-radius:0}\\");
          stylex.inject(\\".mivixfar{border-bottom-left-radius:0}\\", 1, \\".mivixfar{border-bottom-right-radius:0}\\");
          stylex.inject(\\".h8391g91{border-top-left-radius:8px}\\", 1, \\".h8391g91{border-top-right-radius:8px}\\");
          stylex.inject(\\".m0cukt09{border-top-right-radius:8px}\\", 1, \\".m0cukt09{border-top-left-radius:8px}\\");
          stylex.inject(\\".gy0ye85a{border-bottom-right-radius:calc(100% - 2px)}\\", 1, \\".gy0ye85a{border-bottom-left-radius:calc(100% - 2px)}\\");
          stylex.inject(\\".mivixfar{border-bottom-left-radius:0}\\", 1, \\".mivixfar{border-bottom-right-radius:0}\\");"
        `);
      });

      test('auto-expands border shorthands', () => {
        expect(
          transform(`
            const borderRadius = 2;
            const styles = stylex.create({
              default: {
                margin: 'calc((100% - 50px) * 0.5) 20px 0',
              },
              error: {
                borderColor: 'red blue',
                borderStyle: 'solid dashed',
                borderWidth: '0 0 2px 0',
              },
              root: {
                border: '1px solid var(--divider)',
                borderRadius: borderRadius * 2,
                borderBottom: '5px solid red',
              },
              short: {
                padding: 'calc((100% - 50px) * 0.5) var(--rightpadding, 20px)',
                paddingTop: 0,
              },
              valid: {
                borderColor: 'green',
                borderStyle: 'solid',
                borderWidth: 1,
              }
            });
          `),
        ).toMatchInlineSnapshot(`
          "const borderRadius = 2;
          stylex.inject(\\".i3w7snjj{margin-top:calc((100% - 50px) * .5)}\\", 1);
          stylex.inject(\\".idhzwy6c{margin-right:20px}\\", 1, \\".idhzwy6c{margin-left:20px}\\");
          stylex.inject(\\".kjdc1dyq{margin-bottom:0}\\", 1);
          stylex.inject(\\".mswf2hbd{margin-left:20px}\\", 1, \\".mswf2hbd{margin-right:20px}\\");
          stylex.inject(\\".h0hlbn7z{border-top-color:red}\\", 0.4);
          stylex.inject(\\".tvldids3{border-right-color:blue}\\", 0.4, \\".tvldids3{border-left-color:blue}\\");
          stylex.inject(\\".awjel6go{border-bottom-color:red}\\", 0.4);
          stylex.inject(\\".n9snmaig{border-left-color:blue}\\", 0.4, \\".n9snmaig{border-right-color:blue}\\");
          stylex.inject(\\".s9ok87oh{border-top-style:solid}\\", 0.4);
          stylex.inject(\\".gmfpv47j{border-right-style:dashed}\\", 0.4, \\".gmfpv47j{border-left-style:dashed}\\");
          stylex.inject(\\".lxqftegz{border-bottom-style:solid}\\", 0.4);
          stylex.inject(\\".su4h28ut{border-left-style:dashed}\\", 0.4, \\".su4h28ut{border-right-style:dashed}\\");
          stylex.inject(\\".frfouenu{border-top-width:0}\\", 0.4);
          stylex.inject(\\".bonavkto{border-right-width:0}\\", 0.4, \\".bonavkto{border-left-width:0}\\");
          stylex.inject(\\".ntrxh2kl{border-bottom-width:2px}\\", 0.4);
          stylex.inject(\\".r7bn319e{border-left-width:0}\\", 0.4, \\".r7bn319e{border-right-width:0}\\");
          stylex.inject(\\".aiyajaxl{border-top:1px solid var(--divider)}\\", 0.3);
          stylex.inject(\\".fo7qhhrp{border-right:1px solid var(--divider)}\\", 0.3, \\".fo7qhhrp{border-left:1px solid var(--divider)}\\");
          stylex.inject(\\".azmosjmx{border-left:1px solid var(--divider)}\\", 0.3, \\".azmosjmx{border-right:1px solid var(--divider)}\\");
          stylex.inject(\\".dl2p71xr{border-top-left-radius:4px}\\", 1, \\".dl2p71xr{border-top-right-radius:4px}\\");
          stylex.inject(\\".h0c7ht3v{border-top-right-radius:4px}\\", 1, \\".h0c7ht3v{border-top-left-radius:4px}\\");
          stylex.inject(\\".j8nb7h05{border-bottom-right-radius:4px}\\", 1, \\".j8nb7h05{border-bottom-left-radius:4px}\\");
          stylex.inject(\\".gffp4m6x{border-bottom-left-radius:4px}\\", 1, \\".gffp4m6x{border-bottom-right-radius:4px}\\");
          stylex.inject(\\".j42iuzh4{border-bottom:5px solid red}\\", 0.3);
          stylex.inject(\\".h9d8p3y9{padding-right:var(--rightpadding,20px)}\\", 1, \\".h9d8p3y9{padding-left:var(--rightpadding,20px)}\\");
          stylex.inject(\\".mbao2bx1{padding-bottom:calc((100% - 50px) * .5)}\\", 1);
          stylex.inject(\\".iroq9065{padding-left:var(--rightpadding,20px)}\\", 1, \\".iroq9065{padding-right:var(--rightpadding,20px)}\\");
          stylex.inject(\\".srn514ro{padding-top:0}\\", 1);
          stylex.inject(\\".cqotfd8r{border-top-color:green}\\", 0.4);
          stylex.inject(\\".dth01l8s{border-right-color:green}\\", 0.4, \\".dth01l8s{border-left-color:green}\\");
          stylex.inject(\\".fhwwqjh9{border-bottom-color:green}\\", 0.4);
          stylex.inject(\\".ozbm2uno{border-left-color:green}\\", 0.4, \\".ozbm2uno{border-right-color:green}\\");
          stylex.inject(\\".s9ok87oh{border-top-style:solid}\\", 0.4);
          stylex.inject(\\".s9ljgwtm{border-right-style:solid}\\", 0.4, \\".s9ljgwtm{border-left-style:solid}\\");
          stylex.inject(\\".lxqftegz{border-bottom-style:solid}\\", 0.4);
          stylex.inject(\\".bf1zulr9{border-left-style:solid}\\", 0.4, \\".bf1zulr9{border-right-style:solid}\\");
          stylex.inject(\\".r4jidfu8{border-top-width:1px}\\", 0.4);
          stylex.inject(\\".ahb38r9s{border-right-width:1px}\\", 0.4, \\".ahb38r9s{border-left-width:1px}\\");
          stylex.inject(\\".scpwgmsl{border-bottom-width:1px}\\", 0.4);
          stylex.inject(\\".opot3u1k{border-left-width:1px}\\", 0.4, \\".opot3u1k{border-right-width:1px}\\");"
        `);
      });

      test('correctly removes shadowed properties when using conditions with shadowed namespace styles', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                padding: 5,
                paddingStart: 15,
              },

              bar: {
                padding: 2,
                paddingStart: 10,
              },
            });

            styles({
              bar: true,
              foo: isFoo,
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
          stylex.inject(\\".p4n9ro91{padding-right:5px}\\", 1, \\".p4n9ro91{padding-left:5px}\\");
          stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
          stylex.inject(\\".fk6all4f{padding-left:15px}\\", 1, \\".fk6all4f{padding-right:15px}\\");
          stylex.inject(\\".ngbj85sm{padding-top:2px}\\", 1);
          stylex.inject(\\".pdnn8mpk{padding-right:2px}\\", 1, \\".pdnn8mpk{padding-left:2px}\\");
          stylex.inject(\\".rt9i6ysf{padding-bottom:2px}\\", 1);
          stylex.inject(\\".qbvjirod{padding-left:10px}\\", 1, \\".qbvjirod{padding-right:10px}\\");
          stylex.dedupe({
            \\"padding-top-1\\": \\"ngbj85sm\\",
            \\"padding-end-1\\": \\"pdnn8mpk\\",
            \\"padding-bottom-1\\": \\"rt9i6ysf\\",
            \\"padding-start-1\\": \\"qbvjirod\\"
          }, isFoo ? {
            \\"padding-top-1\\": \\"d1v569po\\",
            \\"padding-end-1\\": \\"p4n9ro91\\",
            \\"padding-bottom-1\\": \\"onux6t7x\\",
            \\"padding-start-1\\": \\"fk6all4f\\"
          } : null);"
        `);
      });

      test('converts factory calls to stylex calls when composing', () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              default2: {
                backgroundColor: 'blue',
              }
            });
            const x = styles('default');
            const y = styles('default', active && 'default2');
            const z = styles(props ? 'default2' : 'default');
            stylex(styles.default, styles.default2, props);
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          const styles = {
            default: {
              color: \\"h3ivgpu3\\"
            },
            default2: {
              backgroundColor: \\"n6f2byep\\"
            }
          };
          const x = stylex(styles.default);
          const y = stylex(styles.default, active && styles.default2);
          const z = stylex(props ? styles.default2 : styles.default);
          stylex(styles.default, styles.default2, props);"
        `);
      });

      test("don't rewrite shadowed styles", () => {
        expect(
          transform(`
            const styles = stylex.create({
              default: {
                color: 'blue',
              },
            });

            {
              let styles = function() {};
              styles();
            }
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
          {
            let styles = function () {};

            styles();
          }"
        `);
      });

      test("ensure multiple conditional namespaces don't cause excess whitespace", () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                color: 'red',
              },
              bar: {
                backgroundColor: 'blue',
              },
            });

            styles({
              foo: isFoo,
              bar: isBar,
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          (isFoo ? \\"h3ivgpu3\\" : \\"\\") + (isBar ? \\" n6f2byep\\" : \\"\\");"
        `);
      });

      test('correctly removes shadowed properties when using conditions', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                padding: 5,
              },

              bar: {
                padding: 2,
                paddingStart: 10,
              },
            });

            styles({
              bar: true,
              foo: isFoo,
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".d1v569po{padding-top:5px}\\", 1);
          stylex.inject(\\".p4n9ro91{padding-right:5px}\\", 1, \\".p4n9ro91{padding-left:5px}\\");
          stylex.inject(\\".onux6t7x{padding-bottom:5px}\\", 1);
          stylex.inject(\\".t4os9e1m{padding-left:5px}\\", 1, \\".t4os9e1m{padding-right:5px}\\");
          stylex.inject(\\".ngbj85sm{padding-top:2px}\\", 1);
          stylex.inject(\\".pdnn8mpk{padding-right:2px}\\", 1, \\".pdnn8mpk{padding-left:2px}\\");
          stylex.inject(\\".rt9i6ysf{padding-bottom:2px}\\", 1);
          stylex.inject(\\".qbvjirod{padding-left:10px}\\", 1, \\".qbvjirod{padding-right:10px}\\");
          stylex.dedupe({
            \\"padding-top-1\\": \\"ngbj85sm\\",
            \\"padding-end-1\\": \\"pdnn8mpk\\",
            \\"padding-bottom-1\\": \\"rt9i6ysf\\",
            \\"padding-start-1\\": \\"qbvjirod\\"
          }, isFoo ? {
            \\"padding-top-1\\": \\"d1v569po\\",
            \\"padding-end-1\\": \\"p4n9ro91\\",
            \\"padding-bottom-1\\": \\"onux6t7x\\",
            \\"padding-start-1\\": \\"t4os9e1m\\"
          } : null);"
        `);
      });

      test('transforms media queries', () => {
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
            styles('default');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\"@media (min-width: 1000px){.psrm59q7.psrm59q7{background-color:blue}}\\", 2);
          stylex.inject(\\"@media (min-width: 2000px){.bi4461le.bi4461le{background-color:purple}}\\", 2);
          \\"bi4461le psrm59q7 gyzkc3zm\\";"
        `);
      });

      test('transforms supports queries', () => {
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
            styles('default');
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\"@supports (hover: hover){.s3zv1jgm.s3zv1jgm{background-color:blue}}\\", 2);
          stylex.inject(\\"@supports not (hover: hover){.btbcoxja.btbcoxja{background-color:purple}}\\", 2);
          \\"btbcoxja s3zv1jgm gyzkc3zm\\";"
        `);
      });

      test('ensure that the first argument of a stylex.dedupe object.assign call is an object', () => {
        expect(
          transform(`
            const styles = stylex.create({
              highLevel: {
                marginTop: 24,
              },
              lowLevel: {
                marginTop: 16,
              },
            });
            styles({
              highLevel: headingLevel === 1 || headingLevel === 2,
              lowLevel: headingLevel === 3 || headingLevel === 4,
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gmvq99xn{margin-top:24px}\\", 1);
          stylex.inject(\\".r6ydv39a{margin-top:16px}\\", 1);
          stylex.dedupe(headingLevel === 1 || headingLevel === 2 ? {
            \\"margin-top-1\\": \\"gmvq99xn\\"
          } : {}, headingLevel === 3 || headingLevel === 4 ? {
            \\"margin-top-1\\": \\"r6ydv39a\\"
          } : null);"
        `);
      });
    });

    describe('plugin options', () => {
      test('add dev class name to plain stylex value calls', () => {
        const options = {
          dev: true,
          filename: 'html/js/FooBar.react.js',
        };
        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                color: 'red',
              }
            });
            styles('default');
          `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          \\"FooBar__default h3ivgpu3\\";"
        `);
      });

      test('add dev class name to condition stylex value calls', () => {
        const options = {
          dev: true,
          filename: 'html/js/FooBar.react.js',
        };
        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                color: 'red',
              },
              active: {
                backgroundColor: 'blue',
              }
            });
            styles('default', isActive && 'active');
          `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"FooBar__default h3ivgpu3\\" + (isActive ? \\" FooBar__active n6f2byep\\" : \\"\\");"
        `);
      });

      test('add dev class name to collision stylex value calls', () => {
        const options = {
          dev: true,
          filename: 'html/js/FooBar.react.js',
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
            styles('default', isActive && 'active');
          `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h3ivgpu3{color:red}\\", 1);
          stylex.inject(\\".y6ups3dp{color:blue}\\", 1);
          stylex.dedupe({
            \\"FooBar__default\\": \\"FooBar__default\\",
            \\"color-1\\": \\"h3ivgpu3\\"
          }, isActive ? {
            \\"FooBar__active\\": \\"FooBar__active\\",
            \\"color-1\\": \\"y6ups3dp\\"
          } : null);"
        `);
      });

      test("don't output style classes when in test mode", () => {
        const options = {
          dev: true,
          filename: 'html/js/FooBar.react.js',
          test: true,
        };
        expect(
          transform(
            `
            const styles = stylex.create({
              default: {
                backgroundColor: 'red',
              },

              blue: {
                backgroundColor: 'blue',
              },
            });
            styles('default');
            styles('default', isBlue && 'blue');
            styles({
              default: true,
              blue: isBlue,
            });
          `,
            options,
          ),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\".n6f2byep{background-color:blue}\\", 1);
          \\"FooBar__default\\";
          stylex.dedupe({
            \\"FooBar__default\\": \\"FooBar__default\\"
          }, isBlue ? {
            \\"FooBar__blue\\": \\"FooBar__blue\\"
          } : null);
          stylex.dedupe({
            \\"FooBar__default\\": \\"FooBar__default\\"
          }, isBlue ? {
            \\"FooBar__blue\\": \\"FooBar__blue\\"
          } : null);"
        `);
      });
    });
  });
});
