/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_APPLE} from 'shared/environment';

//disable eslint sorting rule for quick reference to shortcuts
/* eslint-disable sort-keys-fix/sort-keys-fix */
export const SHORTCUTS = Object.freeze({
  // (Ctrl|⌘) + (Alt|Option) + <key> shortcuts
  NORMAL: IS_APPLE ? '⌘+Opt+0' : 'Ctrl+Alt+0',
  HEADING1: IS_APPLE ? '⌘+Opt+1' : 'Ctrl+Alt+1',
  HEADING2: IS_APPLE ? '⌘+Opt+2' : 'Ctrl+Alt+2',
  HEADING3: IS_APPLE ? '⌘+Opt+3' : 'Ctrl+Alt+3',
  BULLET_LIST: IS_APPLE ? '⌘+Opt+4' : 'Ctrl+Alt+4',
  NUMBERED_LIST: IS_APPLE ? '⌘+Opt+5' : 'Ctrl+Alt+5',
  CHECK_LIST: IS_APPLE ? '⌘+Opt+6' : 'Ctrl+Alt+6',
  CODE_BLOCK: IS_APPLE ? '⌘+Opt+C' : 'Ctrl+Alt+C',
  QUOTE: IS_APPLE ? '⌘+Opt+Q' : 'Ctrl+Alt+Q',

  // (Ctrl|⌘) + Shift + <key> shortcuts
  INCREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+.' : 'Ctrl+Shift+.',
  DECREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+,' : 'Ctrl+Shift+,',
  INSERT_CODE_BLOCK: IS_APPLE ? '⌘+Shift+C' : 'Ctrl+Shift+C',
  STRIKETHROUGH: IS_APPLE ? '⌘+Shift+S' : 'Ctrl+Shift+S',
  LOWERCASE: IS_APPLE ? '⌘+Shift+1' : 'Ctrl+Shift+1',
  UPPERCASE: IS_APPLE ? '⌘+Shift+2' : 'Ctrl+Shift+2',
  CAPITALIZE: IS_APPLE ? '⌘+Shift+3' : 'Ctrl+Shift+3',
  CENTER_ALIGN: IS_APPLE ? '⌘+Shift+E' : 'Ctrl+Shift+E',
  JUSTIFY_ALIGN: IS_APPLE ? '⌘+Shift+J' : 'Ctrl+Shift+J',
  LEFT_ALIGN: IS_APPLE ? '⌘+Shift+L' : 'Ctrl+Shift+L',
  RIGHT_ALIGN: IS_APPLE ? '⌘+Shift+R' : 'Ctrl+Shift+R',

  // (Ctrl|⌘) + <key> shortcuts
  SUBSCRIPT: IS_APPLE ? '⌘+,' : 'Ctrl+,',
  SUPERSCRIPT: IS_APPLE ? '⌘+.' : 'Ctrl+.',
  INDENT: IS_APPLE ? '⌘+]' : 'Ctrl+]',
  OUTDENT: IS_APPLE ? '⌘+[' : 'Ctrl+[',
  CLEAR_FORMATTING: IS_APPLE ? '⌘+\\' : 'Ctrl+\\',
  REDO: IS_APPLE ? '⌘+Shift+Z' : 'Ctrl+Y',
  UNDO: IS_APPLE ? '⌘+Z' : 'Ctrl+Z',
  BOLD: IS_APPLE ? '⌘+B' : 'Ctrl+B',
  ITALIC: IS_APPLE ? '⌘+I' : 'Ctrl+I',
  UNDERLINE: IS_APPLE ? '⌘+U' : 'Ctrl+U',
  INSERT_LINK: IS_APPLE ? '⌘+K' : 'Ctrl+K',
});

export function controlOrMeta(metaKey: boolean, ctrlKey: boolean): boolean {
  return IS_APPLE ? metaKey : ctrlKey;
}

export function isFormatParagraph(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;

  return (
    (code === 'Numpad0' || code === 'Digit0') &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatHeading(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  const keyNumber = code[code.length - 1];

  return (
    ['1', '2', '3'].includes(keyNumber) &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatBulletList(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad4' || code === 'Digit4') &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatNumberedList(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad5' || code === 'Digit5') &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatCheckList(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad6' || code === 'Digit6') &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatCode(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyC' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatQuote(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyQ' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isLowercase(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad1' || code === 'Digit1') &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isUppercase(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad2' || code === 'Digit2') &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isCapitalize(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    (code === 'Numpad3' || code === 'Digit3') &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isStrikeThrough(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyS' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isIndent(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'BracketRight' &&
    !shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isOutdent(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'BracketLeft' &&
    !shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isCenterAlign(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyE' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isLeftAlign(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyL' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isRightAlign(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyR' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isJustifyAlign(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyJ' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isSubscript(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'Comma' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isSuperscript(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'Period' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isInsertCodeBlock(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyC' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isIncreaseFontSize(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'Period' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isDecreaseFontSize(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'Comma' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}

export function isClearFormatting(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'Backslash' &&
    !shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isInsertLink(event: KeyboardEvent): boolean {
  const {code, shiftKey, altKey, metaKey, ctrlKey} = event;
  return (
    code === 'KeyK' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey)
  );
}
