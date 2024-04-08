/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
} from '../utils/index.mjs';

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

export async function moveToPrevWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowLeft');
  await keyUpCtrlOrAlt(page);
}

export async function selectPrevWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowLeft');
  await keyUpCtrlOrAlt(page);
  await page.keyboard.up('Shift');
}

export async function moveToNextWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowRight');
  await keyUpCtrlOrAlt(page);
}

export async function extendToNextWord(page) {
  await page.keyboard.down('Shift');
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('ArrowRight');
  await keyUpCtrlOrAlt(page);
  await page.keyboard.up('Shift');
}

export async function deleteNextWord(page) {
  await keyDownCtrlOrAlt(page);
  await page.keyboard.press('Delete');
  await keyUpCtrlOrAlt(page);
}

export async function deleteBackward(page) {
  if (IS_MAC) {
    await page.keyboard.down('Control');
    await page.keyboard.press('h');
    await page.keyboard.up('Control');
  } else {
    await page.keyboard.press('Backspace');
  }
}

export async function deleteForward(page) {
  if (IS_MAC) {
    await page.keyboard.down('Control');
    await page.keyboard.press('d');
    await page.keyboard.up('Control');
  } else {
    await page.keyboard.press('Delete');
  }
}

export async function moveToParagraphBeginning(page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowUp');
    await keyUpCtrlOrAlt(page);
  } else {
    await page.keyboard.press('Home');
  }
}

export async function moveToParagraphEnd(page) {
  if (IS_MAC) {
    await keyDownCtrlOrAlt(page);
    await page.keyboard.press('ArrowDown');
    await keyUpCtrlOrMeta(page);
  } else {
    await page.keyboard.press('End');
  }
}

export async function selectAll(page) {
  // TODO Normalize #4665
  if (E2E_BROWSER === 'firefox' && IS_LINUX) {
    await evaluate(page, () => {
      const rootElement = document.querySelector('div[contenteditable="true"]');
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

export async function moveLeft(page, numCharacters = 1, delayMs) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }
    await page.keyboard.press('ArrowLeft');
  }
}

export async function moveRight(page, numCharacters = 1, delayMs) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }
    await page.keyboard.press('ArrowRight');
  }
}

export async function moveUp(page, numCharacters = 1, delayMs) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }
    await page.keyboard.press('ArrowUp');
  }
}

export async function moveDown(page, numCharacters = 1, delayMs) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }
    await page.keyboard.press('ArrowDown');
  }
}

export async function pressBackspace(page, numCharacters = 1, delayMs) {
  for (let i = 0; i < numCharacters; i++) {
    if (delayMs !== undefined) {
      await sleep(delayMs);
    }
    await page.keyboard.press('Backspace');
  }
}

export async function selectCharacters(page, direction, numCharacters = 1) {
  const moveFunction = direction === 'left' ? moveLeft : moveRight;
  await page.keyboard.down('Shift');
  await moveFunction(page, numCharacters);
  await page.keyboard.up('Shift');
}

export async function toggleBold(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('b');
  await keyUpCtrlOrMeta(page);
}

export async function toggleUnderline(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('u');
  await keyUpCtrlOrMeta(page);
}

export async function toggleItalic(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('i');
  await keyUpCtrlOrMeta(page);
}

export async function pressShiftEnter(page) {
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
}

export async function moveToStart(page) {
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

export async function moveToEnd(page) {
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

export async function paste(page) {
  await keyDownCtrlOrMeta(page);
  await page.keyboard.press('KeyV');
  await keyUpCtrlOrMeta(page);
}
