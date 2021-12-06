/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {addClassNamesToElement} from 'outline/elements';

describe('OutlineElementHelpers tests', () => {
  describe('addClassNamesToElement()', () => {
    test('basic', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, 'test-class');

      expect(element.className).toEqual('test-class');
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
    });

    test('space separated (i.e. stylex)', async () => {
      const element = document.createElement('div');

      addClassNamesToElement(element, 'a b c');

      expect(element.className).toEqual('a b c');
    });
  });
});
