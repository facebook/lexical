/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {IS_APPLE, IS_MAC} from './OutlineEnv';

function controlOrMeta(event: KeyboardEvent): boolean {
  if (IS_MAC) {
    return event.metaKey;
  }
  return event.ctrlKey;
}

export function isBold(event: KeyboardEvent): boolean {
  return event.key === 'b' && controlOrMeta(event);
}

export function isItalic(event: KeyboardEvent): boolean {
  return event.key === 'i' && controlOrMeta(event);
}

export function isParagraph(event: KeyboardEvent): boolean {
  return event.key === 'Enter' && !event.shiftKey;
}

export function isLineBreak(event: KeyboardEvent): boolean {
  return event.key === 'Enter' && event.shiftKey;
}

export function isDeleteWordBackward(event: KeyboardEvent): boolean {
  const isBackspace = event.key === 'Backspace';
  if (IS_MAC) {
    return event.altKey && isBackspace;
  }
  return event.ctrlKey && isBackspace;
}

export function isDeleteWordForward(event: KeyboardEvent): boolean {
  const isDelete = event.key === 'Delete';
  if (IS_MAC) {
    return event.altKey && isDelete;
  }
  return event.ctrlKey && isDelete;
}

export function isDeleteLineBackward(event: KeyboardEvent): boolean {
  return IS_MAC && event.metaKey && event.key === 'Backspace';
}

export function isDeleteLineForward(event: KeyboardEvent): boolean {
  return IS_MAC && event.metaKey && event.key === 'Delete';
}

export function isDeleteBackward(event: KeyboardEvent): boolean {
  const {key, shiftKey, altKey, metaKey, ctrlKey} = event;
  const isBackspace = key === 'Backspace';
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isBackspace || (key === 'h' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace;
}

export function isDeleteForward(event: KeyboardEvent): boolean {
  const {key, shiftKey, altKey, metaKey, ctrlKey} = event;
  const isDelete = key === 'Delete';
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete || (key === 'd' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete;
}

export function isUndo(event: KeyboardEvent): boolean {
  return event.key === 'z' && !event.shiftKey && controlOrMeta(event);
}

export function isRedo(event: KeyboardEvent): boolean {
  const {key, shiftKey, ctrlKey} = event;
  if (IS_MAC) {
    return key === 'z' && event.metaKey && shiftKey;
  }
  return (key === 'y' && ctrlKey) || (key === 'z' && ctrlKey && shiftKey);
}

export function isTab(event: KeyboardEvent): boolean {
  return (
    event.key === 'Tab' && !event.altKey && !event.ctrlKey && !event.metaKey
  );
}

export function isSelectAll(event: KeyboardEvent): boolean {
  return event.key === 'a' && (IS_MAC ? event.metaKey : event.ctrlKey);
}

export function isMoveWordBackward(event: KeyboardEvent): boolean {
  const {key, altKey, metaKey, ctrlKey} = event;
  const isLeftArrow = key === 'ArrowLeft';
  if (IS_APPLE) {
    if (ctrlKey || metaKey) {
      return false;
    }
    return isLeftArrow && altKey;
  }
  if (altKey || metaKey) {
    return false;
  }
  return isLeftArrow && ctrlKey;
}
