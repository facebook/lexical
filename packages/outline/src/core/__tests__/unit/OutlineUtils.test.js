/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {createTextNode} from 'outline';

import {
  emptyFunction,
  invariant,
  resetRandomKey,
  generateRandomKey,
  getAdjustedSelectionOffset,
  isArray,
  isSelectionWithinEditor,
  getTextDirection,
  getDOMTextNodeFromElement,
  isImmutableOrInertOrSegmented,
} from '../../OutlineUtils';

import {initializeUnitTest} from '../utils';

describe('OutlineUtils tests', () => {
  initializeUnitTest((testEnv) => {
    test('scheduleMicroTask(): native', async () => {
      jest.resetModules();
      const {scheduleMicroTask} = require('../../OutlineUtils');
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
      const {scheduleMicroTask} = require('../../OutlineUtils');
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

    test('invariant()', () => {
      expect(invariant).toBeInstanceOf(Function);
      expect(() => invariant()).toThrow();
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

    test('getAdjustedSelectionOffset()', () => {
      const div = document.createElement('div');
      div.innerHTML = '<span>foo</span><br><span>bar</span><span>baz</span>';
      const foo = div.querySelector(':nth-child(1)');
      const bar = div.querySelector(':nth-child(3)');
      const baz = div.querySelector(':nth-child(4)');
      expect(getAdjustedSelectionOffset(foo)).toBe(0);
      expect(getAdjustedSelectionOffset(bar)).toBe(0);
      expect(getAdjustedSelectionOffset(baz)).toBe(1);
    });

    test('isArray()', () => {
      expect(isArray).toBeInstanceOf(Function);
      expect(isArray).toBe(Array.isArray);
    });

    test('isSelectionWithinEditor()', async () => {
      const {editor} = testEnv;
      let textNode;
      await editor.update((view) => {
        const root = view.getRoot();
        textNode = createTextNode('foo');
        root.append(textNode);
      });
      const domSelection = window.getSelection();
      expect(
        isSelectionWithinEditor(
          editor,
          domSelection.anchorNode,
          domSelection.focusNode,
        ),
      ).toBe(false);
      await editor.update((view) => {
        textNode.select(0, 0);
      });
      expect(
        isSelectionWithinEditor(
          editor,
          domSelection.anchorNode,
          domSelection.focusNode,
        ),
      ).toBe(true);
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

    test('getDOMTextNodeFromElement()', () => {
      const div = document.createElement('div');
      div.innerHTML = 'foo';
      const textNode = getDOMTextNodeFromElement(div);
      expect(textNode).toBeInstanceOf(Node);
      expect(textNode.nodeType).toBe(3);
      expect(textNode.textContent).toBe('foo');
      const emptyDiv = document.createElement('div');
      expect(() => getDOMTextNodeFromElement(emptyDiv)).toThrow();
    });

    test('isImmutableOrInertOrSegmented()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const node = createTextNode('foo');
        expect(isImmutableOrInertOrSegmented(node)).toBe(false);

        const immutableNode = createTextNode().makeImmutable();
        expect(isImmutableOrInertOrSegmented(immutableNode)).toBe(true);

        const inertNode = createTextNode('foo').makeInert();
        expect(isImmutableOrInertOrSegmented(inertNode)).toBe(true);

        const segmentedNode = createTextNode('foo').makeSegmented();
        expect(isImmutableOrInertOrSegmented(segmentedNode)).toBe(true);
      });
    });
  });
});
