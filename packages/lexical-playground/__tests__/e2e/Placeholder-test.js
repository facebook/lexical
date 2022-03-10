/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  focusEditor,
  textContent,
  IS_COLLAB,
} from '../utils';

describe('Placeholder', () => {
  initializeE2E((e2e) => {
    it(`Displays a placeholder when no content is present`, async () => {
      const {page, isRichText} = e2e;

      await focusEditor(page);
      const content = await textContent(page, '.Placeholder__root');
      if (IS_COLLAB) {
        expect(content).toBe('Enter some collaborative rich text...');
      } else if (isRichText) {
        expect(content).toBe('Enter some rich text...');
      } else {
        expect(content).toBe('Enter some plain text...');
      }

      await assertHTML(
        page,
        '<p class="PlaygroundEditorTheme__paragraph"><br></p>',
      );
      await assertSelection(page, {
        anchorPath: [0],
        anchorOffset: 0,
        focusPath: [0],
        focusOffset: 0,
      });
    });
  });
});
