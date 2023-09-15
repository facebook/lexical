/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Page} from '@playwright/test';

import {
  E2E_BROWSER,
  evaluate,
  IS_LINUX,
  IS_MAC,
  keyDownCtrlOrAlt,
  keyDownCtrlOrMeta,
  keyUpCtrlOrAlt,
  keyUpCtrlOrMeta,
  sleep,
} from '../utils';

export async function moveToLineBeginning(page: Page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowLeft');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('Home');
  }
}

export async function moveToLineEnd(page: Page) {
  if (IS_MAC) {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('ArrowRight');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('End');
  }
}

export async function moveToEditorBeginning(page: Page) {
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

export async function moveToEditorEnd(page: Page) {
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

export async function moveToPrevWord(page: Page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowLeft');
  await keyUpCtrlOrAlt(page);
}

export async function moveToNextWord(page: Page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowRight');
  await keyUpCtrlOrAlt(page);
}

export async function extendToNextWord(page: Page) {
  await page.keyboard.down('Shift');
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowRight');
  await keyUpCtrlOrAlt(page);
  await page.keyboard.up('Shift');
}

export async function deleteNextWord(page: Page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('Delete');
  await keyUpCtrlOrAlt(page);
}

export async function deleteBackward(page: Page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('h');
  await page.keyboard.up('Control');
}

export async function deleteForward(page: Page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('d');
  await page.keyboard.up('Control');
}

export async function moveToParagraphBeginning(page: Page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowUp');
    await keyUpCtrlOrAlt(page);
  } else {
    await page.keyboard.press('Home');
  }
}

export async function moveToParagraphEnd(page: Page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowDown');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('End');
  }
}

export async function selectAll(page: Page) {
  if (E2E_BROWSER === 'firefox' && IS_LINUX) {
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
      const selection = window.getSelection();

      if (rootElement) {
        selection?.setBaseAndExtent(
          rootElement,
          0,
          rootElement,
          rootElement.childNodes.length,
        );
      }
    });
  } else {
    await keyDownCtrlOrMeta(page);
    await page.keyboard.press('a');
    await keyUpCtrlOrMeta(page);
  }
}

export async function undo(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('z');
  await keyUpCtrlOrMeta(page);
}

export async function redo(page: Page) {
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

async function pressKeyTimes(
  page: Page,
  key: string,
  numCharacters = 1,
  delayMs?: number,
) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }

    await page.keyboard.press(key);
  }
}

export async function moveLeft(
  page: Page,
  numCharacters = 1,
  delayMs?: number,
) {
  await pressKeyTimes(page, 'ArrowLeft', numCharacters, delayMs);
}

export async function moveRight(
  page: Page,
  numCharacters = 1,
  delayMs?: number,
) {
  await pressKeyTimes(page, 'ArrowRight', numCharacters, delayMs);
}

export async function moveDown(
  page: Page,
  numCharacters = 1,
  delayMs?: number,
) {
  await pressKeyTimes(page, 'ArrowDown', numCharacters, delayMs);
}

export async function pressBackspace(
  page: Page,
  numCharacters = 1,
  delayMs?: number,
) {
  await pressKeyTimes(page, 'Backspace', numCharacters, delayMs);
}

export async function selectCharacters(
  page: Page,
  direction: 'left' | 'right',
  numCharacters = 1,
) {
  const moveFunction = direction === 'left' ? moveLeft : moveRight;
  await page.keyboard.down('Shift');
  await moveFunction(page, numCharacters);
  await page.keyboard.up('Shift');
}

export async function toggleBold(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('b');
  await keyUpCtrlOrMeta(page);
}

export async function toggleUnderline(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('u');
  await keyUpCtrlOrMeta(page);
}

export async function toggleItalic(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('i');
  await keyUpCtrlOrMeta(page);
}

export async function pressShiftEnter(page: Page) {
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
}

export async function moveToStart(page: Page) {
  if (IS_MAC) {
    await page.keyboard.down('Meta');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.up('Control');
  }
}

export async function moveToEnd(page: Page) {
  if (IS_MAC) {
    await page.keyboard.down('Meta');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Meta');
  } else {
    await page.keyboard.down('Control');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.up('Control');
  }
}

export async function paste(page: Page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('KeyV');
  await keyUpCtrlOrMeta(page);
}
