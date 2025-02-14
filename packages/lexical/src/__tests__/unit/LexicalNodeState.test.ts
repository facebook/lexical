/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {makeStateWrapper} from '@lexical/utils';
import {
  $createParagraphNode,
  $getRoot,
  $getState,
  $getStateChange,
  $setState,
  createState,
  ParagraphNode,
  RootNode,
  SerializedLexicalNode,
} from 'lexical';

import {initializeUnitTest} from '../utils';
import {TestNode} from './LexicalNode.test';

// https://www.totaltypescript.com/how-to-test-your-types
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

const numberState = createState('numberState', {
  parse: (v) => (typeof v === 'number' ? v : 0),
});
const numberStateWrapper = makeStateWrapper(numberState);
class StateNode extends TestNode {
  static getType() {
    return 'state';
  }
  static clone(node: StateNode) {
    return new StateNode(node.__key);
  }
  static importJSON(serializedNode: SerializedLexicalNode): TestNode {
    return new StateNode().updateFromJSON(serializedNode);
  }
  getNumber = numberStateWrapper.makeGetterMethod<this>();
  setNumber = numberStateWrapper.makeSetterMethod<this>();
}
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
          expect(json).not.toHaveProperty('state');
          $setState(paragraph, numberState, 1);
          const json2 = paragraph.exportJSON();
          expect(json2.state).toStrictEqual({
            numberState: 1,
          });
          const paragraph2 = ParagraphNode.importJSON(json2);
          const json3 = paragraph2.exportJSON();
          expect(json3.state).toStrictEqual({
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
          expect(stateNode.exportJSON().state).toStrictEqual({
            numberState: 2,
          });
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
          expect(json).not.toHaveProperty('state');
          $setState(paragraph, indentState, 1);
          const json2 = paragraph.exportJSON();
          expect(json2.state).toStrictEqual({
            indent: 1,
          });
          // set the default value explicitly
          $setState(paragraph, indentState, 0);
          const json3 = paragraph.exportJSON();
          expect(json3).not.toHaveProperty('state');

          const foo = createState('foo', {
            parse: (value) => (typeof value === 'string' ? value : ''),
          });
          $setState(paragraph, foo, 'fooValue');
          const json4 = paragraph.exportJSON();
          expect(json4.state).toStrictEqual({
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
    },
    {
      namespace: '',
      nodes: [TestNode, StateNode],
      theme: {},
    },
  );
});
