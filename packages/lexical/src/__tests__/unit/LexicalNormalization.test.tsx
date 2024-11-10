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
  RangeSelection,
} from 'lexical';

import {$normalizeSelection} from '../../LexicalNormalization';
import {
  $createTestDecoratorNode,
  $createTestElementNode,
  initializeUnitTest,
} from '../utils';

describe('LexicalNormalization tests', () => {
  initializeUnitTest((testEnv) => {
    describe('$normalizeSelection', () => {
      for (const reversed of [false, true]) {
        const getAnchor = (x: RangeSelection) =>
          reversed ? x.focus : x.anchor;
        const getFocus = (x: RangeSelection) => (reversed ? x.anchor : x.focus);
        const reversedStr = reversed ? ' (reversed)' : '';

        test(`paragraph to text nodes${reversedStr}`, async () => {
          const {editor} = testEnv;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const text1 = $createTextNode('a');
            const text2 = $createTextNode('b');
            paragraph.append(text1, text2);
            root.append(paragraph);

            const selection = paragraph.select();
            getAnchor(selection).set(paragraph.__key, 0, 'element');
            getFocus(selection).set(paragraph.__key, 2, 'element');

            const normalizedSelection = $normalizeSelection(selection);
            expect(getAnchor(normalizedSelection).type).toBe('text');
            expect(getAnchor(normalizedSelection).getNode().__key).toBe(
              text1.__key,
            );
            expect(getAnchor(normalizedSelection).offset).toBe(0);
            expect(getFocus(normalizedSelection).type).toBe('text');
            expect(getFocus(normalizedSelection).getNode().__key).toBe(
              text2.__key,
            );
            expect(getFocus(normalizedSelection).offset).toBe(1);
          });
        });

        test(`paragraph to text node + element${reversedStr}`, async () => {
          const {editor} = testEnv;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const text1 = $createTextNode('a');
            const elementNode = $createTestElementNode();
            paragraph.append(text1, elementNode);
            root.append(paragraph);

            const selection = paragraph.select();
            getAnchor(selection).set(paragraph.__key, 0, 'element');
            getFocus(selection).set(paragraph.__key, 2, 'element');

            const normalizedSelection = $normalizeSelection(selection);
            expect(getAnchor(normalizedSelection).type).toBe('text');
            expect(getAnchor(normalizedSelection).getNode().__key).toBe(
              text1.__key,
            );
            expect(getAnchor(normalizedSelection).offset).toBe(0);
            expect(getFocus(normalizedSelection).type).toBe('element');
            expect(getFocus(normalizedSelection).getNode().__key).toBe(
              elementNode.__key,
            );
            expect(getFocus(normalizedSelection).offset).toBe(0);
          });
        });

        test(`paragraph to text node + decorator${reversedStr}`, async () => {
          const {editor} = testEnv;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const text1 = $createTextNode('a');
            const decoratorNode = $createTestDecoratorNode();
            paragraph.append(text1, decoratorNode);
            root.append(paragraph);

            const selection = paragraph.select();
            getAnchor(selection).set(paragraph.__key, 0, 'element');
            getFocus(selection).set(paragraph.__key, 2, 'element');

            const normalizedSelection = $normalizeSelection(selection);
            expect(getAnchor(normalizedSelection).type).toBe('text');
            expect(getAnchor(normalizedSelection).getNode().__key).toBe(
              text1.__key,
            );
            expect(getAnchor(normalizedSelection).offset).toBe(0);
            expect(getFocus(normalizedSelection).type).toBe('element');
            expect(getFocus(normalizedSelection).getNode().__key).toBe(
              paragraph.__key,
            );
            expect(getFocus(normalizedSelection).offset).toBe(2);
          });
        });

        test(`text + text node${reversedStr}`, async () => {
          const {editor} = testEnv;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const text1 = $createTextNode('a');
            const text2 = $createTextNode('b');
            paragraph.append(text1, text2);
            root.append(paragraph);

            const selection = paragraph.select();
            getAnchor(selection).set(text1.__key, 0, 'text');
            getFocus(selection).set(text2.__key, 1, 'text');

            const normalizedSelection = $normalizeSelection(selection);
            expect(getAnchor(normalizedSelection).type).toBe('text');
            expect(getAnchor(normalizedSelection).getNode().__key).toBe(
              text1.__key,
            );
            expect(getAnchor(normalizedSelection).offset).toBe(0);
            expect(getFocus(normalizedSelection).type).toBe('text');
            expect(getFocus(normalizedSelection).getNode().__key).toBe(
              text2.__key,
            );
            expect(getFocus(normalizedSelection).offset).toBe(1);
          });
        });

        test(`paragraph to test element to text + text${reversedStr}`, async () => {
          const {editor} = testEnv;
          editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const elementNode = $createTestElementNode();
            const text1 = $createTextNode('a');
            const text2 = $createTextNode('b');
            elementNode.append(text1, text2);
            paragraph.append(elementNode);
            root.append(paragraph);

            const selection = paragraph.select();
            getAnchor(selection).set(text1.__key, 0, 'text');
            getFocus(selection).set(text2.__key, 1, 'text');

            const normalizedSelection = $normalizeSelection(selection);
            expect(getAnchor(normalizedSelection).type).toBe('text');
            expect(getAnchor(normalizedSelection).getNode().__key).toBe(
              text1.__key,
            );
            expect(getAnchor(normalizedSelection).offset).toBe(0);
            expect(getFocus(normalizedSelection).type).toBe('text');
            expect(getFocus(normalizedSelection).getNode().__key).toBe(
              text2.__key,
            );
            expect(getFocus(normalizedSelection).offset).toBe(1);
          });
        });
      }
    });
  });
});
