/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {keyDownCtrlOrMeta, keyUpCtrlOrMeta} from '../utils';

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

    it('can navigate through the plain text word by word', async () => {
      const {page} = e2e;
      await page.focus('div.editor');
      // type sample text
      await page.keyboard.type('  123 abc 456  def  ');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 20,
        focusPath: [0, 0, 0],
        focusOffset: 20,
      });
      // navigate through the text
      // 1 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 15,
        focusPath: [0, 0, 0],
        focusOffset: 15,
      });
      // 2 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 10,
        focusPath: [0, 0, 0],
        focusOffset: 10,
      });
      // 3 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
      // 4 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });
      // 5 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
      // 1 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
      // 2 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 9,
        focusPath: [0, 0, 0],
        focusOffset: 9,
      });
      // 3 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 13,
        focusPath: [0, 0, 0],
        focusOffset: 13,
      });
      // 4 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 18,
        focusPath: [0, 0, 0],
        focusOffset: 18,
      });
      // 5 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 20,
        focusPath: [0, 0, 0],
        focusOffset: 20,
      });
    });

    it('can navigate through the formatted text word by word', async () => {
      const {page} = e2e;
      await page.focus('div.editor');
      // type sample text
      await page.keyboard.type('  123 abc 456  def  ');
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 20,
        focusPath: [0, 0, 0],
        focusOffset: 20,
      });
      // select "de" and make it bold
      await moveToPrevWord(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.up('Shift');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      // select "ab" and make it bold
      await moveToPrevWord(page);
      await moveToPrevWord(page);
      await moveToPrevWord(page);
      await page.keyboard.down('Shift');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.up('Shift');
      await keyDownCtrlOrMeta(page);
      await page.keyboard.press('b');
      await keyUpCtrlOrMeta(page);
      await moveToLineEnd(page);
      await assertSelection(page, {
        anchorPath: [0, 4, 0],
        anchorOffset: 3,
        focusPath: [0, 4, 0],
        focusOffset: 3,
      });
      // navigate through the text
      // 1 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 7,
        focusPath: [0, 2, 0],
        focusOffset: 7,
      });
      // 2 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 2,
        focusPath: [0, 2, 0],
        focusOffset: 2,
      });
      // 3 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 6,
        focusPath: [0, 0, 0],
        focusOffset: 6,
      });
      // 4 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 2,
        focusPath: [0, 0, 0],
        focusOffset: 2,
      });
      // 5 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
      // 1 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 5,
        focusPath: [0, 0, 0],
        focusOffset: 5,
      });
      // 2 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 1,
        focusPath: [0, 2, 0],
        focusOffset: 1,
      });
      // 3 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 5,
        focusPath: [0, 2, 0],
        focusOffset: 5,
      });
      // 4 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 4, 0],
        anchorOffset: 1,
        focusPath: [0, 4, 0],
        focusOffset: 1,
      });
      // 5 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 4, 0],
        anchorOffset: 3,
        focusPath: [0, 4, 0],
        focusOffset: 3,
      });
    });

    it('can navigate through the text with emoji word by word', async () => {
      const {page} = e2e;
      await page.focus('div.editor');
      // type sample text
      await page.keyboard.type('123:)456 abc:):)de fg');
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 5,
        focusPath: [0, 6, 0],
        focusOffset: 5,
      });
      // navigate through the text
      // 1 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 3,
        focusPath: [0, 6, 0],
        focusOffset: 3,
      });
      // 2 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 0,
        focusPath: [0, 6, 0],
        focusOffset: 0,
      });
      // 3 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 4,
        focusPath: [0, 2, 0],
        focusOffset: 4,
      });
      // 4 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 0,
        focusPath: [0, 2, 0],
        focusOffset: 0,
      });
      // 5 left
      await moveToPrevWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 0,
        focusPath: [0, 0, 0],
        focusOffset: 0,
      });
      // 1 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 0, 0],
        anchorOffset: 3,
        focusPath: [0, 0, 0],
        focusOffset: 3,
      });
      // 2 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 3,
        focusPath: [0, 2, 0],
        focusOffset: 3,
      });
      // 3 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 2, 0],
        anchorOffset: 7,
        focusPath: [0, 2, 0],
        focusOffset: 7,
      });
      // 4 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 2,
        focusPath: [0, 6, 0],
        focusOffset: 2,
      });
      // 5 right
      await moveToNextWord(page);
      await assertSelection(page, {
        anchorPath: [0, 6, 0],
        anchorOffset: 5,
        focusPath: [0, 6, 0],
        focusOffset: 5,
      });
    });
  });
});
