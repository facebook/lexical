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
  // (Ctrl|⌘) + Alt + <key> shortcuts
  NORMAL: IS_APPLE ? '⌘+Alt+0' : 'Ctrl+Alt+0',
  HEADING1: IS_APPLE ? '⌘+Alt+1' : 'Ctrl+Alt+1',
  HEADING2: IS_APPLE ? '⌘+Alt+2' : 'Ctrl+Alt+2',
  HEADING3: IS_APPLE ? '⌘+Alt+3' : 'Ctrl+Alt+3',
  BULLET_LIST: IS_APPLE ? '⌘+Alt+4' : 'Ctrl+Alt+4',
  NUMBERED_LIST: IS_APPLE ? '⌘+Alt+5' : 'Ctrl+Alt+5',
  CHECK_LIST: IS_APPLE ? '⌘+Alt+6' : 'Ctrl+Alt+6',
  CODE_BLOCK: IS_APPLE ? '⌘+Alt+C' : 'Ctrl+Alt+C',
  QUOTE: IS_APPLE ? '⌘+Alt+Q' : 'Ctrl+Alt+Q',

  // (Ctrl|⌘) + Shift + <key> shortcuts
  INCREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+.' : 'Ctrl+Shift+.',
  DECREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+,' : 'Ctrl+Shift+,',
  INSERT_CODE_BLOCK: IS_APPLE ? '⌘+Shift+C' : 'Ctrl+Shift+C',
  STRIKETHROUGH: IS_APPLE ? '⌘+Shift+S' : 'Ctrl+Shift+S',
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

export function isFormatParagraph(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '0' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isFormatHeading(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    ['1', '2', '3'].includes(key) &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatBulletList(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '4' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isFormatNumberedList(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '5' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isFormatCheckList(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '6' && !shiftKey && altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isFormatCode(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'c' &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isFormatQuote(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'q' &&
    !shiftKey &&
    altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isStrikeThrough(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 's' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isIndent(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === ']' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isOutdent(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '[' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isCenterAlign(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'e' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isLeftAlign(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'l' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isRightAlign(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'r' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isJustifyAlign(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'j' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isSubscript(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === ',' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isSuperscript(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return key === '.' && !shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isInsertCodeBlock(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'c' &&
    shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isIncreaseFontSize(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  // shift + '.' becomes '>' on US keyboards. See https://keycode.info/
  return key === '>' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isDecreaseFontSize(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  // shift + ',' becomes '<' on US keyboards. See https://keycode.info/
  return key === '<' && shiftKey && !altKey && controlOrMeta(metaKey, ctrlKey);
}

export function isClearFormatting(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === '\\' &&
    !shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}

export function isInsertLink(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  altKey: boolean,
  metaKey: boolean,
): boolean {
  return (
    key.toLowerCase() === 'k' &&
    !shiftKey &&
    !altKey &&
    controlOrMeta(metaKey, ctrlKey)
  );
}
