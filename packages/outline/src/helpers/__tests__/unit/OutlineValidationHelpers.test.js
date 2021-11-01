/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OutlineEditor, View} from 'outline';

import {initializeUnitTest} from '../../../__tests__/utils';
import {createTextNode} from 'outline';
import {isBlank} from 'outline/validation';

describe('OutlineNodeHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    it('isBlank', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((view: View) => {
        const isComposing = editor.isComposing();
        expect(isBlank(isComposing)).toBe(true);
        const paragraph = view.getRoot().getFirstChild();
        paragraph.append(createTextNode('foo'));
        expect(isBlank(isComposing)).toBe(false);
      });
    });
  });
});
