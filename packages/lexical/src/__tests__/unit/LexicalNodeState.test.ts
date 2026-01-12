/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getState,
  $getStateChange,
  $isParagraphNode,
  $setState,
  createState,
  LexicalExportJSON,
  NODE_STATE_KEY,
  type NodeStateJSON,
  ParagraphNode,
  RootNode,
  StateValueOrUpdater,
} from 'lexical';
import {beforeEach, describe, expect, test} from 'vitest';

import {nodeStatesAreEquivalent} from '../../LexicalNodeState';
import {initializeUnitTest, invariant} from '../utils';
import {TestNode} from './LexicalNode.test';

// https://www.totaltypescript.com/how-to-test-your-types
type Expect<T extends true> = T;
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

const numberState = createState('numberState', {
  parse: (v) => (typeof v === 'number' ? v : 0),
});
const boolState = createState('boolState', {parse: Boolean});
class StateNode extends TestNode {
  $config() {
    return this.config('state', {
      extends: TestNode,
      stateConfigs: [{flat: true, stateConfig: numberState}, boolState],
    });
  }
  getNumber() {
    return $getState(this, numberState);
  }
  setNumber(valueOrUpdater: StateValueOrUpdater<typeof numberState>): this {
    return $setState(this, numberState, valueOrUpdater);
  }
}

const extraState = createState('extra', {parse: String});
class ExtraStateNode extends StateNode {
  $config() {
    return this.config('extra-state', {
      extends: StateNode,
      stateConfigs: [{flat: true, stateConfig: extraState}],
    });
  }
}

type StateNodeStateJSON = NodeStateJSON<StateNode>;
type _TestNodeStateJSON = Expect<
  Equal<
    StateNodeStateJSON,
    {
      [NODE_STATE_KEY]?: {boolState?: boolean | undefined} | undefined;
      numberState?: number | undefined;
    }
  >
>;
type StateNodeExportJSON = LexicalExportJSON<StateNode>;
type _TestStateNodeExportJSON = Expect<
  Equal<
    StateNodeExportJSON,
    {
      [NODE_STATE_KEY]?:
        | (Record<string, unknown> & {
            boolState?: boolean | undefined;
          })
        | undefined;
      version: number;
      type: 'state';
      numberState?: number | undefined;
    }
  >
>;

type ExtraStateNodeExportJSON = LexicalExportJSON<ExtraStateNode>;
type _TestExtraStateNodeExportJSON = Expect<
  Equal<
    ExtraStateNodeExportJSON,
    {
      [NODE_STATE_KEY]?:
        | (Record<string, unknown> & {
            boolState?: boolean | undefined;
          })
        | undefined;
      version: number;
      type: 'extra-state';
      numberState?: number | undefined;
      extra?: string | undefined;
    }
  >
>;

function $createStateNode() {
  return new StateNode();
}

describe('LexicalNode state', () => {
  initializeUnitTest(
    (testEnv) => {
      let root: RootNode;

      beforeEach(async () => {
        const {editor} = testEnv;
        await editor.update(() => {
          root = $getRoot();
        });
      });

      test(`state.$set() and state.$get() need to be inside an update`, async () => {
        const stringState = createState('stringState', {
          parse: (value) => (typeof value === 'string' ? value : ''),
        });
        const $fn = () => {
          $setState(root, stringState, 'hello');
        };
        const $fn2 = () => {
          $setState(root, stringState, 'hello');
        };
        expect($fn).toThrow();
        expect($fn2).toThrow();
        const {editor} = testEnv;
        editor.update(() => {
          expect($fn).not.toThrow();
          expect($fn2).not.toThrow();
        });
      });

      test('__state is not an enumerable property', () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            expect(Object.keys($getRoot())).not.toContain('__state');
          },
          {discrete: true},
        );
      });

      test(`getState and setState`, async () => {
        const stringState = createState('stringState', {
          parse: (value) => (typeof value === 'string' ? value : ''),
        });
        const {editor} = testEnv;
        editor.update(() => {
          const stringValue = $getState(root, stringState);
          type _Test = Expect<Equal<typeof stringValue, string>>;
          expect(stringValue).toBe('');
          $setState(root, stringState, 'hello');
          expect($getState(root, stringState)).toBe('hello');

          const maybeStringState = createState('maybeStringState', {
            parse: (value) => (typeof value === 'string' ? value : undefined),
          });
          const maybeStringValue = $getState(root, maybeStringState);
          type _Test2 = Expect<
            Equal<typeof maybeStringValue, string | undefined>
          >;
          expect(maybeStringValue).toBeUndefined();
        });
      });

      test(`import and export state`, async () => {
        const {editor} = testEnv;
        editor.update(() => {
          const paragraph = $createParagraphNode();
          const json = paragraph.exportJSON();
          // We don't export state as an empty object
          expect(json).not.toHaveProperty(NODE_STATE_KEY);
          $setState(paragraph, numberState, 1);
          const json2 = paragraph.exportJSON();
          expect(json2[NODE_STATE_KEY]).toStrictEqual({
            numberState: 1,
          });
          const paragraph2 = ParagraphNode.importJSON(json2);
          const json3 = paragraph2.exportJSON();
          expect(json3[NODE_STATE_KEY]).toStrictEqual({
            numberState: 1,
          });
        });
      });

      test('states cannot be registered with the same key string', () => {
        const {editor} = testEnv;
        editor.update(
          () => {
            const k0 = createState('foo', {parse: (v) => !!v});
            const k1 = createState('foo', {parse: () => 'foo'});
            expect($getState(root, k0)).toBe(false);
            $setState(root, k0, true);
            expect($getState(root, k0)).toBe(true);
            expect(() => $getState(root, k1)).toThrow(
              'State key collision "foo" detected in RootNode node with type root and key root. Only one StateConfig with a given key should be used on a node.',
            );
            expect(() => $setState(root, k1, 'foo')).toThrow(
              'State key collision "foo" detected in RootNode node with type root and key root. Only one StateConfig with a given key should be used on a node.',
            );
            expect($getState(root, k0)).toBe(true);
          },
          {discrete: true},
        );
      });

      test('nodeGetter() and nodeSetter()', () => {
        const {editor} = testEnv;
        editor.update(() => {
          const stateNode = $createStateNode();
          expect(stateNode.getNumber()).toBe(0);
          stateNode.setNumber(1);
          expect(stateNode.getNumber()).toBe(1);
          stateNode.setNumber((n) => n + 1);
          expect(stateNode.getNumber()).toBe(2);
          $setState(stateNode, boolState, true);
          expect(stateNode.exportJSON()).toMatchObject({
            [NODE_STATE_KEY]: {boolState: true},
            numberState: 2,
            type: 'state',
          });
        });
      });

      test('flat config serialization round-trip', () => {
        const {editor} = testEnv;
        editor.update(() => {
          const flatJSON: LexicalExportJSON<StateNode> = {
            [NODE_STATE_KEY]: {boolState: true},
            numberState: 2,
            type: 'state',
            version: 1,
          };
          const nestedJSON: LexicalExportJSON<StateNode> = {
            [NODE_STATE_KEY]: {boolState: true, numberState: 2},
            type: 'state',
            version: 1,
          };
          const bothJSON: LexicalExportJSON<StateNode> = {
            [NODE_STATE_KEY]: {boolState: true, numberState: 3},
            numberState: 2,
            type: 'state',
            version: 1,
          };
          for (const doc of [flatJSON, nestedJSON, bothJSON]) {
            const node = StateNode.importJSON(doc);
            expect(node.exportJSON()).toEqual(flatJSON);
            expect($getState(node, boolState)).toBe(true);
            expect($getState(node, numberState)).toBe(2);
          }
        });
      });

      test('default value should not be exported', async () => {
        const {editor} = testEnv;
        editor.update(() => {
          const indentState = createState('indent', {
            parse: (value) => (typeof value === 'number' ? value : 0),
          });
          const paragraph = $createParagraphNode();
          expect($getState(paragraph, indentState)).toBe(0);
          const json = paragraph.exportJSON();
          expect(json).not.toHaveProperty(NODE_STATE_KEY);
          $setState(paragraph, indentState, 1);
          const json2 = paragraph.exportJSON();
          expect(json2[NODE_STATE_KEY]).toStrictEqual({
            indent: 1,
          });
          // set the default value explicitly
          $setState(paragraph, indentState, 0);
          const json3 = paragraph.exportJSON();
          expect(json3).not.toHaveProperty(NODE_STATE_KEY);

          const foo = createState('foo', {
            parse: (value) => (typeof value === 'string' ? value : ''),
          });
          $setState(paragraph, foo, 'fooValue');
          const json4 = paragraph.exportJSON();
          expect(json4[NODE_STATE_KEY]).toStrictEqual({
            foo: 'fooValue',
          });
        });
      });

      test('getState returns immutable values, setState require an Object literal', async () => {
        type TestObject = {
          foo: string;
          bar: number;
        };
        const {editor} = testEnv;
        editor.update(() => {
          const paragraph = $createParagraphNode();
          const objectState = createState('object', {
            parse: (value) =>
              (value as TestObject) || {
                bar: 0,
                foo: '',
              },
          });
          const paragraphObject = $getState(paragraph, objectState);
          type _Test = Expect<
            Equal<
              typeof paragraphObject,
              {
                bar: number;
                foo: string;
              }
            >
          >;

          // @ts-expect-error - foo is required
          $setState(paragraph, objectState, {bar: 1});
          // @ts-expect-error - baz is not a valid property
          $setState(paragraph, objectState, {bar: 1, baz: 'baz', foo: 'foo'});

          $setState(paragraph, objectState, paragraphObject!);
          $setState(paragraph, objectState, {...paragraphObject!, foo: 'foo'});
        });
      });

      test('setting state shouldn’t affect previous reconciled versions of the node', () => {
        const {editor} = testEnv;
        let initialRoot: RootNode;
        let v0: RootNode;
        let v1: RootNode;
        const vk = createState('vk', {
          parse: (v) => (typeof v === 'number' ? v : null),
        });
        editor.update(
          () => {
            initialRoot = $getRoot();
            v0 = $setState(initialRoot, vk, 0);
            expect($getState(v0, vk)).toBe(0);
            expect($getStateChange(v0, initialRoot, vk)).toEqual([0, null]);
          },
          {discrete: true},
        );
        const state0 = editor.getEditorState();
        editor.update(
          () => {
            v1 = $setState(v0, vk, 1);
            expect(v1).not.toBe(v0);
            expect(v1.is(v0)).toBe(true);
            // This is testing getLatest()
            expect($getState(v0, vk)).toBe(1);
            expect($getState(v0, vk, 'direct')).toBe(0);
            expect($getState(v1, vk)).toBe(1);
            expect($getStateChange(v1, v0, vk)).toEqual([1, 0]);
          },
          {discrete: true},
        );
        const state1 = editor.getEditorState();
        // Test that the correct version is returned and that they are independent
        expect(state0.read(() => $getState(v0, vk))).toBe(0);
        expect(state1.read(() => $getState(v1, vk))).toBe(1);
        // Test that getLatest is used and not the __state property directly
        expect(state0.read(() => $getState(v1, vk))).toBe(0);
        expect(state1.read(() => $getState(v0, vk))).toBe(1);
        // Test that 'direct' doesn't actually require an editor state.
        const noState = {
          read<T>(f: () => T): T {
            return f();
          },
        };
        expect(noState.read(() => $getState(initialRoot, vk, 'direct'))).toBe(
          null,
        );
        expect(noState.read(() => $getState(v0, vk, 'direct'))).toBe(0);
        expect(noState.read(() => $getState(v1, vk, 'direct'))).toBe(1);
      });
      describe('nodeStatesAreEquivalent', () => {
        test('undefined states are equivalent', () => {
          expect(nodeStatesAreEquivalent(undefined, undefined)).toBe(true);
        });
        test('TextNode merging only with equivalent state', () => {
          const {editor} = testEnv;
          const classNameState = createState('className', {
            parse: (v) => (typeof v === 'string' ? v : ''),
          });
          const $createTextWithClassName = (className: string) =>
            $setState($createTextNode(className), classNameState, className);
          editor.update(
            () => {
              $getRoot()
                .clear()
                .append(
                  $createParagraphNode().append(
                    $createTextWithClassName('red'),
                    $createTextNode('none!'),
                    $createTextWithClassName('red'),
                    $createTextWithClassName('blue'),
                    $createTextWithClassName('blue'),
                    $createTextWithClassName('red'),
                    $createTextWithClassName('blue'),
                  ),
                );
            },
            {discrete: true},
          );
          editor.read(() => {
            const textNodes = $getRoot().getAllTextNodes();
            expect(textNodes).toHaveLength(6);
            expect(
              textNodes.map((node) => $getState(node, classNameState)),
            ).toEqual(['red', '', 'red', 'blue', 'red', 'blue']);
            expect(textNodes.map((node) => node.getTextContent())).toEqual([
              'red',
              'none!',
              'red',
              'blueblue',
              'red',
              'blue',
            ]);
          });
          editor.update(
            () => {
              const paragraph = $getRoot().getFirstChildOrThrow();
              invariant($isParagraphNode(paragraph), 'must be a paragraph');
              // change none! to red
              $setState(paragraph.getChildAtIndex(1)!, classNameState, 'red');
            },
            {discrete: true},
          );
          editor.read(() => {
            const textNodes = $getRoot().getAllTextNodes();
            expect(textNodes).toHaveLength(4);
            expect(
              textNodes.map((node) => $getState(node, classNameState)),
            ).toEqual(['red', 'blue', 'red', 'blue']);
            expect(textNodes.map((node) => node.getTextContent())).toEqual([
              'rednone!red',
              'blueblue',
              'red',
              'blue',
            ]);
          });
        });
        test('different versions of the same state are not equivalent', () => {
          const {editor} = testEnv;
          let initialRoot!: RootNode;
          let v0!: RootNode;
          let v1!: RootNode;
          let v2!: RootNode;
          let v3!: RootNode;
          let v4!: RootNode;
          let v5!: RootNode;
          const vk = createState('vk', {
            parse: (v) => (typeof v === 'number' ? v : null),
          });
          editor.update(
            () => {
              initialRoot = $getRoot();
              v0 = $setState(initialRoot, vk, 0);
              expect($getState(v0, vk)).toBe(0);
              expect($getStateChange(v0, initialRoot, vk)).toEqual([0, null]);
            },
            {discrete: true},
          );
          editor.update(
            () => {
              v1 = $setState(v0, vk, 1);
              expect(v1).not.toBe(v0);
              expect(v1.is(v0)).toBe(true);
              // This is testing getLatest()
              expect($getState(v0, vk)).toBe(1);
              expect($getState(v0, vk, 'direct')).toBe(0);
              expect($getState(v1, vk)).toBe(1);
              expect($getStateChange(v1, v0, vk)).toEqual([1, 0]);
            },
            {discrete: true},
          );
          // Set the state back to v0
          editor.update(
            () => {
              v2 = $setState(v1, vk, 0);
            },
            {discrete: true},
          );
          // Set the state back to default
          editor.update(
            () => {
              v3 = $setState(v2, vk, null);
            },
            {discrete: true},
          );
          editor.update(
            () => {
              v4 = v3.updateFromJSON({
                ...v3.exportJSON(),
                [NODE_STATE_KEY]: {vk: 1},
              });
            },
            {discrete: true},
          );
          editor.update(
            () => {
              v5 = v4.updateFromJSON({
                ...v4.exportJSON(),
                [NODE_STATE_KEY]: {unknown: true, vk: 1},
              });
            },
            {discrete: true},
          );
          // Each sub-array's elements are all equivalent, but not equivalent to states from other arrays
          const equivalences = [
            [initialRoot.__state, v3.__state, undefined],
            [v0.__state, v2.__state],
            [v1.__state, v4.__state],
            [v5.__state],
          ];
          for (let i = 0; i < equivalences.length; i++) {
            const aSet = equivalences[i];
            for (let j = i + 1; j < equivalences.length; j++) {
              const bSet = equivalences[j];
              for (const a of aSet) {
                for (const b of bSet) {
                  expect(nodeStatesAreEquivalent(a, b)).toBe(false);
                  expect(nodeStatesAreEquivalent(b, a)).toBe(false);
                }
              }
            }
            for (let j = 0; j < aSet.length; j++) {
              const a0 = aSet[j];
              for (let k = j + 1; k < aSet.length; k++) {
                const a1 = aSet[k];
                expect(nodeStatesAreEquivalent(a0, a1)).toBe(true);
                expect(nodeStatesAreEquivalent(a1, a0)).toBe(true);
              }
            }
          }
        });
      });
    },
    {
      namespace: '',
      nodes: [TestNode, StateNode],
      theme: {},
    },
  );
});
