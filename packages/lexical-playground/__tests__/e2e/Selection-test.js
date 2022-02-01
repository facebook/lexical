/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  sleep,
  click,
  focusEditor,
  waitForSelector,
  insertImage,
  evaluate,
} from '../utils';

describe('Selection', () => {
  initializeE2E((e2e) => {
    it('does not focus the editor on load', async () => {
      const editorHasFocus = async () =>
        await evaluate(page, () => {
          const editorElement = document.querySelector(
            'div[contenteditable="true"]',
          );
          return document.activeElement === editorElement;
        });
      const {page} = e2e;
      expect(await editorHasFocus()).toEqual(false);
      await sleep(500);
      expect(await editorHasFocus()).toEqual(false);
    });

    async function enableNestedEditorTreeView(page) {
      await click(page, '#options-button');
      await click(page, '.switch label:text("Nested Editors Tree View")');
    }

    async function assertSelectionInTreeView(
      page,
      expectSelectionToExist = true,
      editorParentSelector = '.editor-shell',
    ) {
      if (expectSelectionToExist) {
        await waitForSelector(
          page,
          `${editorParentSelector} .tree-view-output:has-text("selection")`,
        );
        await waitForSelector(
          page,
          `${editorParentSelector} .tree-view-output:has-text("anchor")`,
        );
      } else {
        await waitForSelector(
          page,
          `${editorParentSelector} .tree-view-output:has-text("selection: null")`,
        );
      }
    }

    it('keeps single active selection for nested editors', async () => {
      const {page, isRichText} = e2e;

      if (!isRichText) {
        return;
      }

      await focusEditor(page);
      await insertImage(page, 'Hello world');
      await enableNestedEditorTreeView(page, '.image-caption-container');
      await assertSelectionInTreeView(page, true, '.image-caption-container');
      await assertSelectionInTreeView(page, false, '.editor-shell');

      // Click outside of the editor and check that selection remains the same
      await click(page, 'header img');
      await assertSelectionInTreeView(page, true, '.image-caption-container');
      await assertSelectionInTreeView(page, false, '.editor-shell');

      // Back to root editor
      await focusEditor(page, '.editor-shell');
      await assertSelectionInTreeView(page, false, '.image-caption-container');
      await assertSelectionInTreeView(page, true, '.editor-shell');

      // // Click outside of the editor and check that selection remains the same
      await click(page, 'header img');
      await assertSelectionInTreeView(page, false, '.image-caption-container');
      await assertSelectionInTreeView(page, true, '.editor-shell');

      // Back to nested editor editor
      await focusEditor(page, '.image-caption-container');
      await assertSelectionInTreeView(page, true, '.image-caption-container');
      await assertSelectionInTreeView(page, false, '.editor-shell');
    });
  });
});
