/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$getRoot, ParagraphNode} from 'lexical';

import {LexicalNode} from '../../LexicalNode';
import {createState} from '../../LexicalNodeState';
import {RootNode} from '../../nodes/LexicalRootNode';
import {initializeUnitTest} from '../utils';
import {TestNode} from './LexicalNode.test';

// https://www.totaltypescript.com/how-to-test-your-types
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

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
          stringState.$set(root, 'hello');
        };
        const $fn2 = () => {
          stringState.$set(root, 'hello');
        };
        expect($fn).toThrow();
        expect($fn2).toThrow();
        const {editor} = testEnv;
        editor.update(() => {
          expect($fn).not.toThrow();
          expect($fn2).not.toThrow();
        });
      });

      test(`getState and setState`, async () => {
        const stringState = createState('stringState', {
          parse: (value) => (typeof value === 'string' ? value : ''),
        });
        const {editor} = testEnv;
        editor.update(() => {
          const stringValue = stringState.$get(root);
          type _Test = Expect<Equal<typeof stringValue, string>>;
          expect(stringValue).toBe('');
          stringState.$set(root, 'hello');
          expect(stringState.$get(root)).toBe('hello');

          const maybeStringState = createState('maybeStringState', {
            parse: (value) => (typeof value === 'string' ? value : undefined),
          });
          const maybeStringValue = maybeStringState.$get(root);
          type _Test2 = Expect<
            Equal<typeof maybeStringValue, string | undefined>
          >;
          expect(maybeStringValue).toBeUndefined();

          const _noSerializableState = createState('noSerializableState', {
            // @ts-expect-error - Date is not serializable
            parse: () => new Date(),
          });
        });
      });

      test(`import and export state`, async () => {
        const {editor} = testEnv;
        editor.update(() => {
          const paragraph = new ParagraphNode();
          const json = paragraph.exportJSON();
          // We don't export state as an empty object
          expect(json).not.toHaveProperty('state');
          const numberState = createState('numberState', {
            parse: (value) => (typeof value === 'number' ? value : 0),
          });
          numberState.$set(paragraph, 1);
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

      // TODO
      //   test('states cannot be registered with the same key string', () => {
      //     expect(() => {
      //       createState('foo', {parse: (value) => undefined});
      //       createState('foo', {parse: (value) => 0});
      //     }).toThrow(
      //       `There has been an attempt to register a state with the key "foo", but it is already registered.`,
      //     );
      //   });

      test('default value should not be exported', async () => {
        const {editor} = testEnv;
        editor.update(() => {
          const indentState = createState('indent', {
            parse: (value) => (typeof value === 'number' ? value : 0),
          });
          const paragraph = new ParagraphNode();
          expect(indentState.$get(paragraph)).toBe(0);
          const json = paragraph.exportJSON();
          expect(json).not.toHaveProperty('state');
          indentState.$set(paragraph, 1);
          const json2 = paragraph.exportJSON();
          expect(json2.state).toStrictEqual({
            indent: 1,
          });
          // set the default value explicitly
          indentState.$set(paragraph, 0);
          const json3 = paragraph.exportJSON();
          expect(json3).not.toHaveProperty('state');

          const foo = createState('foo', {
            parse: (value) => (typeof value === 'string' ? value : ''),
          });
          foo.$set(paragraph, 'fooValue');
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
          const paragraph = new ParagraphNode();
          const objectState = createState('object', {
            parse: (value) =>
              (value as TestObject) || {
                bar: 0,
                foo: '',
              },
          });
          const paragraphObject = objectState.$get(paragraph);
          type _Test = Expect<
            Equal<
              typeof paragraphObject,
              {
                readonly bar: number;
                readonly foo: string;
              }
            >
          >;

          // @ts-expect-error - foo is required
          objectState.$set(paragraph, {bar: 1});
          // @ts-expect-error - baz is not a valid property
          objectState.$set(paragraph, {bar: 1, baz: 'baz', foo: 'foo'});

          objectState.$set(paragraph, paragraphObject!);
          objectState.$set(paragraph, {...paragraphObject!, foo: 'foo'});
        });
      });

      test('setting state shouldn’t affect previous reconciled versions of the node', () => {
        const {editor} = testEnv;
        let v0: RootNode;
        let v1: RootNode;
        const vk = createState('vk', {
          parse: (v) => (typeof v === 'number' ? v : null),
        });
        editor.update(
          () => {
            v0 = $getRoot();
            vk.$set(v0, 0);
            expect(vk.$get(v0)).toBe(0);
          },
          {discrete: true},
        );
        const state0 = editor.getEditorState();
        editor.update(
          () => {
            vk.$set(v0, 1);
            v1 = v0.getLatest();
            // This is testing getLatest()
            expect(vk.$get(v0)).toBe(1);
            expect(vk.$get(v1)).toBe(1);
            expect(v1.is(v0)).toBe(true);
          },
          {discrete: true},
        );
        const state1 = editor.getEditorState();
        // Test that the correct version is returned and that they are independent
        expect(state0.read(() => vk.$get(v0))).toBe(0);
        expect(state1.read(() => vk.$get(v1))).toBe(1);
        // Test that getLatest is used and not the __state property directly
        expect(state0.read(() => vk.$get(v1))).toBe(0);
        expect(state1.read(() => vk.$get(v0))).toBe(1);
      });
    },
    {
      namespace: '',
      nodes: [LexicalNode, TestNode],
      theme: {},
    },
  );
});
