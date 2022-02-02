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
  insertImage,
  evaluate,
  E2E_BROWSER,
} from '../utils';

describe('Selection', () => {
  initializeE2E(
    (e2e) => {
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

      it('keeps single active selection for nested editors', async () => {
        const {page, isRichText} = e2e;

        if (!isRichText) {
          return;
        }

        const hasSelection = async (parentSelector) =>
          await evaluate(
            page,
            (parentSelector) => {
              return (
                document
                  .querySelector(`${parentSelector} > .tree-view-output pre`)
                  .__lexicalEditor.getEditorState()._selection !== null
              );
            },
            parentSelector,
          );

        await focusEditor(page);
        await insertImage(page, 'Hello world');
        expect(await hasSelection('.image-caption-container')).toBe(true);
        expect(await hasSelection('.editor-shell')).toBe(false);

        // Click outside of the editor and check that selection remains the same
        await click(page, 'header img');
        expect(await hasSelection('.image-caption-container')).toBe(true);
        expect(await hasSelection('.editor-shell')).toBe(false);

        // Back to root editor
        if (E2E_BROWSER === 'firefox') {
          // TODO:
          // In firefox .focus() on editor does not trigger selectionchange, while checking it
          // explicitly clicking on an editor (passing position that is on the right side to
          // prevent clicking on image and its nested editor)
          await click(page, '.editor-shell', {position: {x: 600, y: 150}});
        } else {
          await focusEditor(page);
        }
        expect(await hasSelection('.image-caption-container')).toBe(false);
        expect(await hasSelection('.editor-shell')).toBe(true);

        // Click outside of the editor and check that selection remains the same
        await click(page, 'header img');
        expect(await hasSelection('.image-caption-container')).toBe(false);
        expect(await hasSelection('.editor-shell')).toBe(true);

        // Back to nested editor editor
        await focusEditor(page, '.image-caption-container');
        expect(await hasSelection('.image-caption-container')).toBe(true);
        expect(await hasSelection('.editor-shell')).toBe(false);
      });
    },
    {appSettings: {showNestedEditorTreeView: true}},
  );
});
