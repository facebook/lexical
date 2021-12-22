/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E, sleep, evaluate} from '../utils';

describe('Selection', () => {
  initializeE2E((e2e) => {
    it('does not focus the editor on load', async () => {
      const editorHasFocus = async () =>
        await evaluate(page, () => {
          const editorElement = document.querySelector('div.editor');
          return document.activeElement === editorElement;
        });
      const {page} = e2e;
      expect(await editorHasFocus()).toEqual(false);
      await sleep(500);
      expect(await editorHasFocus()).toEqual(false);
    });
  });
});
