/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToEditorEnd,
  moveToLineBeginning,
  moveToLineEnd,
  moveToNextWord,
  moveToParagraphBeginning,
  moveToParagraphEnd,
  moveToPrevWord,
} from '../keyboardShortcuts';
import {initializeE2E, assertSelection} from '../utils';

describe('Keyboard Navigation', () => {
  initializeE2E((e2e) => {
    async function typeParagraphs(page) {
      await page.focus('div.editor');
      await page.keyboard.type(
        'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
      );
      await page.keyboard.press('Enter');
      await page.keyboard.type(
        'It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. ',
      );
      await page.keyboard.press('Enter');
      await page.keyboard.type(
        'It was popularised in the 1960s with the release of Letraset sheets containing lorem ipsum passages.',
      );
    }

    it('can type several paragraphs', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 100,
        focusPath: [2, 0, 0],
        focusOffset: 100,
      });
    });

    it('can move to the beginning of the current line, then back to the end of the current line', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToLineBeginning(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        // Due to text rendering it can be in this range of offsets
        anchorOffset: [68, 79],
        focusPath: [2, 0, 0],
        // Due to text rendering it can be in this range of offsets
        focusOffset: [68, 79],
      });
      await moveToLineEnd(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 100,
        focusPath: [2, 0, 0],
        focusOffset: 100,
      });
    });

    it('can move to the top of the editor', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
    });

    it('can move one word to the right', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
    });

    it('can move to the beginning of the previous word', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 91,
        focusPath: [2, 0, 0],
        focusOffset: 91,
      });
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 85,
        focusPath: [2, 0, 0],
        focusOffset: 85,
      });
    });

    it('can move to the bottom of the editor', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToEditorEnd(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 100,
        focusPath: [2, 0, 0],
        focusOffset: 100,
      });
    });

    it('can move to the beginning of the current paragraph', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToParagraphBeginning(page);
      await assertSelection(page, {
        anchorPath: [2, 0, 0],
        anchorOffset: 0,
        focusPath: [2, 0, 0],
        focusOffset: 0,
      });
    });

    it('can move to the top of the editor, then to the bottom of the current paragraph', async () => {
      const {page} = e2e;
      await typeParagraphs(page);
      await moveToEditorBeginning(page);
      await moveToParagraphEnd(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        // Due to text rendering it can be in this range of offsets
        anchorOffset: [65, 74],
        focusPath: [0, 0, 0],
        // Due to text rendering it can be in this range of offsets
        focusOffset: [65, 74],
      });
    });
  });
});
