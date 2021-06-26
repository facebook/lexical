/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {IS_APPLE} from 'shared/environment';

function controlOrMeta(event: KeyboardEvent): boolean {
  if (IS_APPLE) {
    return event.metaKey;
  }
  return event.ctrlKey;
}

function isReturn(event: KeyboardEvent): boolean {
  return event.keyCode === 13;
}

function isBackspace(event: KeyboardEvent): boolean {
  return event.keyCode === 8;
}

function isDelete(event: KeyboardEvent): boolean {
  return event.keyCode === 46;
}

function isArrowLeft(event: KeyboardEvent): boolean {
  return event.keyCode === 37;
}

function isArrowRight(event: KeyboardEvent): boolean {
  return event.keyCode === 39;
}

export function isBold(event: KeyboardEvent): boolean {
  return event.keyCode === 66 && controlOrMeta(event);
}

export function isItalic(event: KeyboardEvent): boolean {
  return event.keyCode === 73 && controlOrMeta(event);
}

export function isUnderline(event: KeyboardEvent): boolean {
  return event.keyCode === 85 && controlOrMeta(event);
}

export function isParagraph(event: KeyboardEvent): boolean {
  return isReturn(event) && !event.shiftKey;
}

export function isLineBreak(event: KeyboardEvent): boolean {
  return isReturn(event) && event.shiftKey;
}

// Inserts a new line after the selection
export function isOpenLineBreak(event: KeyboardEvent): boolean {  
  // 79 = KeyO
  return IS_APPLE && event.ctrlKey && event.keyCode === 79;
}

export function isDeleteWordBackward(event: KeyboardEvent): boolean {
  return isBackspace(event) && (IS_APPLE ? event.altKey : event.ctrlKey);
}

export function isDeleteWordForward(event: KeyboardEvent): boolean {
  return isDelete(event) && (IS_APPLE ? event.altKey : event.ctrlKey);
}

export function isDeleteLineBackward(event: KeyboardEvent): boolean {
  return IS_APPLE && event.metaKey && isBackspace(event);
}

export function isDeleteLineForward(event: KeyboardEvent): boolean {
  return IS_APPLE && event.metaKey && isDelete(event);
}

export function isDeleteBackward(event: KeyboardEvent): boolean {
  const {keyCode, altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(event) || (keyCode === 72 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(event);
}

export function isDeleteForward(event: KeyboardEvent): boolean {
  const {keyCode, shiftKey, altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(event) || (keyCode === 68 && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(event);
}

export function isUndo(event: KeyboardEvent): boolean {
  return event.keyCode === 90 && !event.shiftKey && controlOrMeta(event);
}

export function isRedo(event: KeyboardEvent): boolean {
  const {keyCode, shiftKey, ctrlKey} = event;
  if (IS_APPLE) {
    return keyCode === 90 && event.metaKey && shiftKey;
  }
  return (keyCode === 89 && ctrlKey) || (keyCode === 90 && ctrlKey && shiftKey);
}

export function isTab(event: KeyboardEvent): boolean {
  return (
    event.keyCode === 90 && !event.altKey && !event.ctrlKey && !event.metaKey
  );
}

export function isSelectAll(event: KeyboardEvent): boolean {
  return event.keyCode === 65 && (IS_APPLE ? event.metaKey : event.ctrlKey);
}

export function isMoveWordBackward(event: KeyboardEvent): boolean {
  const {altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (ctrlKey || metaKey) {
      return false;
    }
    return isArrowLeft(event) && altKey;
  }
  if (altKey || metaKey) {
    return false;
  }
  return isArrowLeft(event) && ctrlKey;
}

export function isMoveWordForward(event: KeyboardEvent): boolean {
  const {altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (ctrlKey || metaKey) {
      return false;
    }
    return isArrowRight(event) && altKey;
  }
  if (altKey || metaKey) {
    return false;
  }
  return isArrowRight(event) && ctrlKey;
}

export function isMoveBackward(event: KeyboardEvent): boolean {
  return (
    isArrowLeft(event) && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}

export function isMoveForward(event: KeyboardEvent): boolean {
  return (
    isArrowRight(event) && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}
