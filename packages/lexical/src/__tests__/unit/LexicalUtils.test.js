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
  ParagraphNode,
  TextNode,
} from 'lexical';

import {
  $getNodeByKey,
  $isTokenOrInertOrSegmented,
  $nodesOfType,
  emptyFunction,
  generateRandomKey,
  getTextDirection,
  isArray,
  isSelectionWithinEditor,
  resetRandomKey,
} from '../../LexicalUtils';
import {initializeUnitTest} from '../utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalUtils tests', () => {
  initializeUnitTest((testEnv) => {
    test('scheduleMicroTask(): native', async () => {
      jest.resetModules();
      const {scheduleMicroTask} = require('../../LexicalUtils');
      let flag = false;
      scheduleMicroTask(() => {
        flag = true;
      });
      expect(flag).toBe(false);
      await null;
      expect(flag).toBe(true);
    });

    test('scheduleMicroTask(): promise', async () => {
      jest.resetModules();
      window.queueMicrotask = undefined;
      const {scheduleMicroTask} = require('../../LexicalUtils');
      let flag = false;
      scheduleMicroTask(() => {
        flag = true;
      });
      expect(flag).toBe(false);
      await null;
      expect(flag).toBe(true);
    });

    test('emptyFunction()', () => {
      expect(emptyFunction).toBeInstanceOf(Function);
      expect(emptyFunction.length).toBe(0);
      expect(emptyFunction()).toBe(undefined);
    });

    test('resetRandomKey()', () => {
      resetRandomKey();
      const key1 = generateRandomKey();
      resetRandomKey();
      const key2 = generateRandomKey();
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(key1).not.toBe('');
      expect(key2).not.toBe('');
      expect(key1).toEqual(key2);
    });

    test('generateRandomKey()', () => {
      const key1 = generateRandomKey();
      const key2 = generateRandomKey();
      expect(typeof key1).toBe('string');
      expect(typeof key2).toBe('string');
      expect(key1).not.toBe('');
      expect(key2).not.toBe('');
      expect(key1).not.toEqual(key2);
    });

    test('isArray()', () => {
      expect(isArray).toBeInstanceOf(Function);
      expect(isArray).toBe(Array.isArray);
    });

    test('isSelectionWithinEditor()', async () => {
      const {editor} = testEnv;
      let textNode;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        textNode = $createTextNode('foo');
        paragraph.append(textNode);
        root.append(paragraph);
      });
      await editor.update(() => {
        const domSelection = window.getSelection();
        expect(
          isSelectionWithinEditor(
            editor,
            domSelection.anchorNode,
            domSelection.focusNode,
          ),
        ).toBe(false);
        textNode.select(0, 0);
      });
      await editor.update(() => {
        const domSelection = window.getSelection();
        expect(
          isSelectionWithinEditor(
            editor,
            domSelection.anchorNode,
            domSelection.focusNode,
          ),
        ).toBe(true);
      });
    });

    test('getTextDirection()', () => {
      expect(getTextDirection('')).toBe(null);
      expect(getTextDirection(' ')).toBe(null);
      expect(getTextDirection('0')).toBe(null);
      expect(getTextDirection('A')).toBe('ltr');
      expect(getTextDirection('Z')).toBe('ltr');
      expect(getTextDirection('a')).toBe('ltr');
      expect(getTextDirection('z')).toBe('ltr');
      expect(getTextDirection('\u00C0')).toBe('ltr');
      expect(getTextDirection('\u00D6')).toBe('ltr');
      expect(getTextDirection('\u00D8')).toBe('ltr');
      expect(getTextDirection('\u00F6')).toBe('ltr');
      expect(getTextDirection('\u00F8')).toBe('ltr');
      expect(getTextDirection('\u02B8')).toBe('ltr');
      expect(getTextDirection('\u0300')).toBe('ltr');
      expect(getTextDirection('\u0590')).toBe('ltr');
      expect(getTextDirection('\u0800')).toBe('ltr');
      expect(getTextDirection('\u1FFF')).toBe('ltr');
      expect(getTextDirection('\u200E')).toBe('ltr');
      expect(getTextDirection('\u2C00')).toBe('ltr');
      expect(getTextDirection('\uFB1C')).toBe('ltr');
      expect(getTextDirection('\uFE00')).toBe('ltr');
      expect(getTextDirection('\uFE6F')).toBe('ltr');
      expect(getTextDirection('\uFEFD')).toBe('ltr');
      expect(getTextDirection('\uFFFF')).toBe('ltr');
      expect(getTextDirection(`\u0591`)).toBe('rtl');
      expect(getTextDirection(`\u07FF`)).toBe('rtl');
      expect(getTextDirection(`\uFB1D`)).toBe('rtl');
      expect(getTextDirection(`\uFDFD`)).toBe('rtl');
      expect(getTextDirection(`\uFE70`)).toBe('rtl');
      expect(getTextDirection(`\uFEFC`)).toBe('rtl');
    });

    test('isTokenOrInertOrSegmented()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = $createTextNode('foo');
        expect($isTokenOrInertOrSegmented(node)).toBe(false);

        const tokenNode = $createTextNode().setMode('token');
        expect($isTokenOrInertOrSegmented(tokenNode)).toBe(true);

        const inertNode = $createTextNode('foo').setMode('inert');
        expect($isTokenOrInertOrSegmented(inertNode)).toBe(true);

        const segmentedNode = $createTextNode('foo').setMode('segmented');
        expect($isTokenOrInertOrSegmented(segmentedNode)).toBe(true);
      });
    });

    test('$getNodeByKey', async () => {
      const {editor} = testEnv;
      let paragraphNode;
      let textNode;

      await editor.update(() => {
        const rootNode = $getRoot();
        paragraphNode = new ParagraphNode();
        textNode = new TextNode('foo');
        paragraphNode.append(textNode);
        rootNode.append(paragraphNode);
      });
      await editor.getEditorState().read(() => {
        expect($getNodeByKey('1')).toBe(paragraphNode);
        expect($getNodeByKey('2')).toBe(textNode);
        expect($getNodeByKey('3')).toBe(null);
      });
      expect(() => $getNodeByKey()).toThrow();
    });

    test('$nodesOfType', async () => {
      const {editor} = testEnv;
      const paragraphKeys = [];
      const $paragraphKeys = () =>
        $nodesOfType(ParagraphNode).map((node) => node.getKey());
      await editor.update(() => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        $createParagraphNode();
        root.append(paragraph1, paragraph2);
        paragraphKeys.push(paragraph1.getKey(), paragraph2.getKey());
        const currentParagraphKeys = $paragraphKeys();
        expect(currentParagraphKeys).toHaveLength(paragraphKeys.length);
        expect(currentParagraphKeys).toEqual(
          expect.arrayContaining(paragraphKeys),
        );
      });
      editor.getEditorState().read(() => {
        const currentParagraphKeys = $paragraphKeys();
        expect(currentParagraphKeys).toHaveLength(paragraphKeys.length);
        expect(currentParagraphKeys).toEqual(
          expect.arrayContaining(paragraphKeys),
        );
      });
    });
  });
});
