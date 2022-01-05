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

describe('babel-plugin-transform-stylex', () => {
  /**
   * stylex.create
   */

  describe('[validation] stylex.create()', () => {
    test('must be bound to a variable', () => {
      expect(() => {
        transform(`
          stylex.create({});
        `);
      }).toThrow(messages.UNBOUND_STYLEX_CALL_VALUE);
    });

    test('must be called at top level', () => {
      expect(() => {
        transform(`
          if (bar) {
            const styles = stylex.create({});
          } 
       `);
      }).toThrow(messages.ONLY_TOP_LEVEL);
    });

    test('its only argument must be a single object', () => {
      expect(() => {
        transform(`
          const styles = stylex.create(genStyles());
        `);
      }).toThrow(messages.NON_OBJECT_FOR_STYLEX_CALL);
      expect(() => {
        transform(`
          const styles = stylex.create();
        `);
      }).toThrow(messages.ILLEGAL_ARGUMENT_LENGTH);
      expect(() => {
        transform(`
          const styles = stylex.create({}, {});
        `);
      }).toThrow(messages.ILLEGAL_ARGUMENT_LENGTH);
      expect(() => {
        transform(`
          const styles = stylex.create({});
        `);
      }).not.toThrow();
    });

    test('namespace keys must be a static value', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({
            [root]: {
              backgroundColor: 'red',
            }
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
    });

    test('namespace values must be an object', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({
            namespace: false,
          });
        `);
      }).toThrow(messages.ILLEGAL_NAMESPACE_VALUE);
      expect(() => {
        transform(`
          const styles = stylex.create({
            namespace: {},
          });
        `);
      }).not.toThrow();
    });

    /* Properties */

    test('properties must be a static value', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({
            root: {
              [backgroundColor]: 'red',
            }
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
    });

    /* Values */

    test('values must be static (arrays of) number or string in stylex.create()', () => {
      // number
      expect(() => {
        transform(`
          const styles = stylex.create({
            root: {
              padding: 5,
            }
          });
        `);
      }).not.toThrow();
      // string
      expect(() => {
        transform(`
          const styles = stylex.create({
            root: {
              backgroundColor: 'red',
            }
          });
        `);
      }).not.toThrow();
      // array of numbers
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              transitionDuration: [500],
            },
          });
        `);
      }).not.toThrow();
      // array of strings
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              transitionDuration: ['0.5s'],
            },
          });
        `);
      }).not.toThrow();
      // not string or number
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              transitionDuration: [[], {}],
            },
          });
        `);
      }).toThrow(messages.ILLEGAL_PROP_ARRAY_VALUE);
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              color: true,
            },
          });
        `);
      }).toThrow(messages.ILLEGAL_PROP_VALUE);
      // not static
      expect(() => {
        transform(`
          const styles = stylex.create({
            root: {
              backgroundColor: backgroundColor,
            }
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
      expect(() => {
        transform(`
          const styles = stylex.create({
            root: {
              backgroundColor: generateBg(),
            }
          });
        `);
      }).toThrow(messages.NON_STATIC_VALUE);
    });

    test('values can reference local bindings in stylex.create()', () => {
      expect(() => {
        transform(`
          const bg = '#eee';
          const styles = stylex.create({
            root: {
              backgroundColor: bg,
            }
          });
        `);
      }).not.toThrow();
    });

    test('values can be pure complex expressions in stylex.create()', () => {
      expect(() => {
        transform(`
          const borderRadius = 2;
          const styles = stylex.create({
            root: {
              borderRadius: borderRadius * 2,
            }
          });
        `);
      }).not.toThrow();
    });

    test('values can be template literal expressions in stylex.create()', () => {
      expect(() => {
        transform(`
          const borderSize = 2;
          const styles = stylex.create({
            root: {
              borderRadius: \`\${borderSize * 2}px\`,
            }
          });
        `);
      }).not.toThrow();
    });

    /* Complex selectors */

    test('pseudo-classes must start with ":" character', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              ':hover': {},
            },
          });
        `);
      }).not.toThrow();
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              'hover': {},
            },
          });
        `);
      }).toThrow(messages.INVALID_PSEUDO);
    });

    test('pseudo-classes cannot be nested', () => {
      expect(() => {
        transform(`
          const styles = stylex.create({
            default: {
              ':hover': {
                ':active': {},
              },
            },
          });
        `);
      }).toThrow(messages.ILLEGAL_NESTED_PSEUDO);
    });
  });
});
