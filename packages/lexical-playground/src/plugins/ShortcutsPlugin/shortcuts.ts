/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {IS_APPLE} from '@lexical/utils';
import {isExactShortcutMatch, isModifierMatch} from 'lexical';

//disable eslint sorting rule for quick reference to shortcuts
/* eslint-disable sort-keys-fix/sort-keys-fix */
export const SHORTCUTS = Object.freeze({
  // (Ctrl|⌘) + (Alt|Option) + <key> shortcuts
  NORMAL: IS_APPLE ? '⌘+Opt+0' : 'Ctrl+Alt+0',
  HEADING1: IS_APPLE ? '⌘+Opt+1' : 'Ctrl+Alt+1',
  HEADING2: IS_APPLE ? '⌘+Opt+2' : 'Ctrl+Alt+2',
  HEADING3: IS_APPLE ? '⌘+Opt+3' : 'Ctrl+Alt+3',
  NUMBERED_LIST: IS_APPLE ? '⌘+Shift+7' : 'Ctrl+Shift+7',
  BULLET_LIST: IS_APPLE ? '⌘+Shift+8' : 'Ctrl+Shift+8',
  CHECK_LIST: IS_APPLE ? '⌘+Shift+9' : 'Ctrl+Shift+9',
  CODE_BLOCK: IS_APPLE ? '⌘+Opt+C' : 'Ctrl+Alt+C',
  QUOTE: IS_APPLE ? '⌃+Shift+Q' : 'Ctrl+Shift+Q',
  ADD_COMMENT: IS_APPLE ? '⌘+Opt+M' : 'Ctrl+Alt+M',

  // (Ctrl|⌘) + Shift + <key> shortcuts
  INCREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+.' : 'Ctrl+Shift+.',
  DECREASE_FONT_SIZE: IS_APPLE ? '⌘+Shift+,' : 'Ctrl+Shift+,',
  INSERT_CODE_BLOCK: IS_APPLE ? '⌘+Shift+C' : 'Ctrl+Shift+C',
  STRIKETHROUGH: IS_APPLE ? '⌘+Shift+X' : 'Ctrl+Shift+X',
  LOWERCASE: IS_APPLE ? '⌃+Shift+1' : 'Ctrl+Shift+1',
  UPPERCASE: IS_APPLE ? '⌃+Shift+2' : 'Ctrl+Shift+2',
  CAPITALIZE: IS_APPLE ? '⌃+Shift+3' : 'Ctrl+Shift+3',
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

const CONTROL_OR_META = {ctrlKey: !IS_APPLE, metaKey: IS_APPLE};

export function isFormatParagraph(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '0', {
    ...CONTROL_OR_META,
    altKey: true,
  });
}

export function isFormatHeading(event: KeyboardEvent): boolean {
  const {key} = event;

  return (
    ['1', '2', '3'].includes(key) &&
    isModifierMatch(event, {...CONTROL_OR_META, altKey: true})
  );
}

export function isFormatNumberedList(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '7', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isFormatBulletList(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '8', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isFormatCheckList(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '9', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isFormatCode(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'c', {
    ...CONTROL_OR_META,
    altKey: true,
  });
}

export function isFormatQuote(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'q', {
    ctrlKey: true,
    shiftKey: true,
  });
}

export function isLowercase(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '1', {ctrlKey: true, shiftKey: true});
}

export function isUppercase(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '2', {ctrlKey: true, shiftKey: true});
}

export function isCapitalize(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '3', {ctrlKey: true, shiftKey: true});
}

export function isStrikeThrough(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'x', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isIndent(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, ']', CONTROL_OR_META);
}

export function isOutdent(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '[', CONTROL_OR_META);
}

export function isCenterAlign(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'e', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isLeftAlign(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'l', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isRightAlign(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'r', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isJustifyAlign(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'j', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isSubscript(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, ',', CONTROL_OR_META);
}

export function isSuperscript(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '.', CONTROL_OR_META);
}

export function isInsertCodeBlock(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'c', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isIncreaseFontSize(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '>', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isDecreaseFontSize(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '<', {
    ...CONTROL_OR_META,
    shiftKey: true,
  });
}

export function isClearFormatting(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, '\\', CONTROL_OR_META);
}

export function isInsertLink(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'k', CONTROL_OR_META);
}

export function isAddComment(event: KeyboardEvent): boolean {
  return isExactShortcutMatch(event, 'm', {
    ...CONTROL_OR_META,
    altKey: true,
  });
}
