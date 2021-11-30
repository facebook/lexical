/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  IS_MAC,
  IS_LINUX,
  keyDownCtrlOrAlt,
  keyDownCtrlOrMeta,
  keyUpCtrlOrAlt,
  keyUpCtrlOrMeta,
  E2E_BROWSER,
  evaluate,
} from '../utils';

export async function moveToLineBeginning(page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowLeft');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('Home');
  }
}

export async function moveToLineEnd(page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowRight');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('End');
  }
}

export async function moveToEditorBeginning(page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowUp');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('PageUp');
    if (E2E_BROWSER === 'firefox') {
      await page.keyboard.press('Home');
    }
  }
}

export async function moveToEditorEnd(page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowDown');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('PageDown');
    if (E2E_BROWSER === 'firefox') {
      await page.keyboard.press('End');
    }
  }
}

export async function moveToNextWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowRight');
  await keyUpCtrlOrAlt(page);
}

export async function deleteNextWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('Delete');
  await keyUpCtrlOrAlt(page);
}

export async function moveToPrevWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowLeft');
  await keyUpCtrlOrAlt(page);
}

export async function moveToParagraphBeginning(page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowUp');
    // Firefox has a known bug with this key command, but if we press it again
    // we can work around the bug.
    if (E2E_BROWSER === 'firefox') {
      await page.keyboard.press('ArrowUp');
    }
    await keyUpCtrlOrAlt(page);
  } else {
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home');
  }
}

export async function moveToParagraphEnd(page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowDown');
    // Firefox has a known bug with this key command, but if we press it again
    // we can work around the bug.
    if (E2E_BROWSER === 'firefox') {
      await page.keyboard.press('ArrowDown');
    }
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('End');
  }
}

export async function selectAll(page) {
  if (E2E_BROWSER === 'firefox' && IS_LINUX) {
    await evaluate(page, () => {
      const rootElement = document.querySelector('div.editor');
      const selection = window.getSelection();
      selection.setBaseAndExtent(
        rootElement,
        0,
        rootElement,
        rootElement.childNodes.length,
      );
    });
  } else {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('a');
    await keyUpCtrlOrMeta(page);
  }
}

export async function undo(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('z');
  await keyUpCtrlOrMeta(page);
}

export async function redo(page) {
  if (IS_MAC) {
    await page.keyboard.down('Meta');
    await page.keyboard.down('Shift');
    await page.keyboard.press('z');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.down('Control');
    await page.keyboard.press('y');
    await page.keyboard.up('Control');
  }
}

export async function moveLeft(page, numCharacters = 1): Promise<void> {
  for (let i = 0; i < numCharacters; i++) {
    await page.keyboard.press('ArrowLeft');
  }
}

export async function moveRight(page, numCharacters = 1): Promise<void> {
  for (let i = 0; i < numCharacters; i++) {
    await page.keyboard.press('ArrowRight');
  }
}

export async function selectCharacters(
  page,
  direction: 'left' | 'right',
  numCharacters = 1,
): Promise<void> {
  const moveFunction = direction === 'left' ? moveLeft : moveRight;
  await page.keyboard.down('Shift');
  await moveFunction(page, numCharacters);
  await page.keyboard.up('Shift');
}
