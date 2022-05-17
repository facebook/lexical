/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalElementHelpers tests', () => {
  describe('addClassNamesToElement() and removeClassNamesFromElement()', () => {
    test('basic', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, 'test-class');

      expect(element.className).toEqual('test-class');

      removeClassNamesFromElement(element, 'test-class');

      expect(element.className).toEqual('');
    });

    test('empty', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, null, undefined, false, true);

      expect(element.className).toEqual('');
    });

    test('multiple', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, 'a', 'b', 'c');

      expect(element.className).toEqual('a b c');

      removeClassNamesFromElement(element, 'a', 'b', 'c');

      expect(element.className).toEqual('');
    });

    test('space separated', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, 'a b c');

      expect(element.className).toEqual('a b c');

      removeClassNamesFromElement(element, 'a b c');

      expect(element.className).toEqual('');
    });
  });
});
