/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTextNode, $getRoot} from 'outline';

import {
  emptyFunction,
  resetRandomKey,
  generateRandomKey,
  isArray,
  isSelectionWithinEditor,
  getTextDirection,
  isTokenOrInertOrSegmented,
} from '../../core/OutlineUtils';

import {initializeUnitTest} from '../utils';
import {$getNodeByKey} from '../../core/OutlineUtils';
import {$createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import {TextNode} from 'outline';

describe('OutlineUtils tests', () => {
  initializeUnitTest((testEnv) => {
    test('scheduleMicroTask(): native', async () => {
      jest.resetModules();
      const {scheduleMicroTask} = require('../../core/OutlineUtils');
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
      const {scheduleMicroTask} = require('../../core/OutlineUtils');
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
        expect(isTokenOrInertOrSegmented(node)).toBe(false);

        const tokenNode = $createTextNode().setMode('token');
        expect(isTokenOrInertOrSegmented(tokenNode)).toBe(true);

        const inertNode = $createTextNode('foo').setMode('inert');
        expect(isTokenOrInertOrSegmented(inertNode)).toBe(true);

        const segmentedNode = $createTextNode('foo').setMode('segmented');
        expect(isTokenOrInertOrSegmented(segmentedNode)).toBe(true);
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
  });
});
