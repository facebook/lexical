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
  describe('[transform] stylex.create()', () => {
    test('transforms style object', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              backgroundColor: 'red',
              color: 'blue',
            }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
        stylex.inject(\\".y6ups3dp{color:blue}\\", 1);"
      `);
    });

    test('transforms style object with custom propety', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              '--background-color': 'red',
            }
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".eq698nx4{--background-color:red}\\", 1);"',
      );
    });

    test('transforms style object with custom propety as value', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              '--final-color': 'var(--background-color)',
            }
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".i4rl8tte{--final-color:var(--background-color)}\\", 1);"',
      );
    });

    test('transforms multiple namespaces', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              backgroundColor: 'red',
            },
            default2: {
              color: 'blue',
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
        stylex.inject(\\".y6ups3dp{color:blue}\\", 1);"
      `);
    });

    test('does not transform attr() value', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              content: 'attr(some-attribute)',
            },
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".fbkz01wb{content:attr(some-attribute)}\\", 1);"',
      );
    });

    test('transforms nested pseudo-class to CSS', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              ':hover': {
                backgroundColor: 'red',
                color: 'blue',
              },
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pbqw5nlk:hover{background-color:red}\\", 8);
        stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);"
      `);
    });

    test('transforms array values as fallbacks', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              position: ['sticky', 'fixed']
            },
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".e8fwzc4u{position:sticky;position:fixed}\\", 1);"',
      );
    });

    // TODO: add more vendor-prefixed properties and values
    test('transforms properties requiring vendor prefixes', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              userSelect: 'none',
            },
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".f14ij5to{-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select:none}\\", 1);"',
      );
    });

    // Legacy, short?
    test('tranforms valid shorthands', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              overflow: 'hidden',
              borderStyle: 'dashed',
              borderWidth: 1
            }
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".lq84ybu9{overflow-x:hidden}\\", 1);
        stylex.inject(\\".hf30pyar{overflow-y:hidden}\\", 1);
        stylex.inject(\\".mkcwp88r{border-top-style:dashed}\\", 0.4);
        stylex.inject(\\".gmfpv47j{border-right-style:dashed}\\", 0.4, \\".gmfpv47j{border-left-style:dashed}\\");
        stylex.inject(\\".c9z4645e{border-bottom-style:dashed}\\", 0.4);
        stylex.inject(\\".su4h28ut{border-left-style:dashed}\\", 0.4, \\".su4h28ut{border-right-style:dashed}\\");
        stylex.inject(\\".r4jidfu8{border-top-width:1px}\\", 0.4);
        stylex.inject(\\".ahb38r9s{border-right-width:1px}\\", 0.4, \\".ahb38r9s{border-left-width:1px}\\");
        stylex.inject(\\".scpwgmsl{border-bottom-width:1px}\\", 0.4);
        stylex.inject(\\".opot3u1k{border-left-width:1px}\\", 0.4, \\".opot3u1k{border-right-width:1px}\\");"
      `);
    });

    // TODO: fix this test
    test.skip('preserves imported object spread', () => {
      expect(
        transform(`
          const styles = stylex.create({
            foo: {
              ...importedStyles
            }
          });
        `),
      ).toMatchInlineSnapshot('""');
    });

    // TODO: what is this actually testing??
    test('transforms complex property values containing custom properties variables', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              boxShadow: '0px 2px 4px var(--shadow-1)',
            }
          });
        `),
      ).toMatchInlineSnapshot(
        '"stylex.inject(\\".gnxgxjws{--T68779821:0 2px 4px var(--shadow-1);-webkit-box-shadow:var(--T68779821);box-shadow:0 2px 4px var(--shadow-1)}\\", 1);"',
      );
    });

    describe('pseudo-classes', () => {
      // TODO: this should either fail or guarantee an insertion order relative to valid pseudo-classes
      test('transforms invalid pseudo-class', () => {
        expect(
          transform(`
          const styles = stylex.create({
            default: {
              ':invalpwdijad': {
                backgroundColor: 'red',
                color: 'blue',
              },
            },
          });
        `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".k6unt73l:invalpwdijad{background-color:red}\\", 2);
          stylex.inject(\\".e05g6ngh:invalpwdijad{color:blue}\\", 2);"
        `);
      });

      test('transforms valid pseudo-classes in order', () => {
        expect(
          transform(`
          const styles = stylex.create({
            default: {
              ':hover': {
                color: 'blue',
              },
              ':active': {
                color: 'red',
              },
              ':focus': {
                color: 'yellow',
              }
            },
          });
        `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);
          stylex.inject(\\".dcijxkbt:active{color:red}\\", 10);
          stylex.inject(\\".qsrzr8xi:focus{color:yellow}\\", 9);"
        `);
      });

      test('transforms pseudo-class with array value as fallbacks', () => {
        expect(
          transform(`
          const styles = stylex.create({
            default: {
              ':hover': {
                position: ['sticky', 'fixed'],
              }
            },
          });
        `),
        ).toMatchInlineSnapshot(
          '"stylex.inject(\\".fk7q53tq:hover{position:sticky;position:fixed}\\", 8);"',
        );
      });
    });

    describe('pseudo-elements', () => {
      test('transforms ::before and ::after', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                '::before': {
                  color: 'red'
                },
              '::after': {
                  color: 'blue'
                },
              },
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".h4s9hi3m::before{color:red}\\", 2);
          stylex.inject(\\".boetlxaj::after{color:blue}\\", 2);"
        `);
      });

      test('transforms ::placeholder', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                '::placeholder': {
                  color: 'gray',
                },
              },
            });
          `),
        ).toMatchInlineSnapshot(
          '"stylex.inject(\\".p7cmcfs2::placeholder{color:gray}\\", 12);"',
        );
      });

      test('transforms ::thumb', () => {
        expect(
          transform(`
            const styles = stylex.create({
              foo: {
                '::thumb': {
                  width: 16,
                },
              },
            });
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".pbjb215a::-webkit-slider-thumb{width:16px}\\", 13);
          stylex.inject(\\".pbjb215a::-moz-range-thumb{width:16px}\\", 13);
          stylex.inject(\\".pbjb215a::-ms-thumb{width:16px}\\", 13);"
        `);
      });
    });

    describe('queries', () => {
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
          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\"@media (min-width: 1000px){.psrm59q7.psrm59q7{background-color:blue}}\\", 2);
          stylex.inject(\\"@media (min-width: 2000px){.bi4461le.bi4461le{background-color:purple}}\\", 2);"
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

          `),
        ).toMatchInlineSnapshot(`
          "stylex.inject(\\".gyzkc3zm{background-color:red}\\", 1);
          stylex.inject(\\"@supports (hover: hover){.s3zv1jgm.s3zv1jgm{background-color:blue}}\\", 2);
          stylex.inject(\\"@supports not (hover: hover){.btbcoxja.btbcoxja{background-color:purple}}\\", 2);"
        `);
      });
    });

    test('[legacy] auto-expands shorthands', () => {
      expect(
        transform(`
          const borderRadius = 2;
          const styles = stylex.create({
            default: {
              margin: 'calc((100% - 50px) * 0.5) 20px 0',
            },
            error: {
              borderColor: 'red blue',
              borderStyle: 'dashed',
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
        stylex.inject(\\".mkcwp88r{border-top-style:dashed}\\", 0.4);
        stylex.inject(\\".gmfpv47j{border-right-style:dashed}\\", 0.4, \\".gmfpv47j{border-left-style:dashed}\\");
        stylex.inject(\\".c9z4645e{border-bottom-style:dashed}\\", 0.4);
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

    test('[legacy] transforms pseudo object with & to CSS', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              '&:hover': {
                backgroundColor: 'red',
                color: 'blue',
              },
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pbqw5nlk:hover{background-color:red}\\", 8);
        stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);"
      `);
    });

    test('[legacy] transforms invalid pseudo object with & to CSS', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              '&:invalpwdijad': {
                backgroundColor: 'red',
                color: 'blue',
              },
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".k6unt73l:invalpwdijad{background-color:red}\\", 2);
        stylex.inject(\\".e05g6ngh:invalpwdijad{color:blue}\\", 2);"
      `);
    });

    test('[legacy] transforms pseudo objects with & to CSS with correct order', () => {
      expect(
        transform(`
          const styles = stylex.create({
            default: {
              '&:hover': {
                backgroundColor: 'red',
                color: 'blue',
              },
              '&:active': {
                backgroundColor: 'blue',
              },
              '&:focus': {
                backgroundColor: 'yellow',
              }
            },
          });
        `),
      ).toMatchInlineSnapshot(`
        "stylex.inject(\\".pbqw5nlk:hover{background-color:red}\\", 8);
        stylex.inject(\\".dvoqa86r:hover{color:blue}\\", 8);
        stylex.inject(\\".h5pumea0:active{background-color:blue}\\", 10);
        stylex.inject(\\".wfgokdwq:focus{background-color:yellow}\\", 9);"
      `);
    });
  });
});
