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

function isEnter(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.keyCode === 13;
}

function isBackspace(event: KeyboardEvent): boolean {
  return event.key === 'Backspace' || event.keyCode === 8;
}

function isDelete(event: KeyboardEvent): boolean {
  return event.key === 'Delete' || event.keyCode === 46;
}

function isArrowLeft(event: KeyboardEvent): boolean {
  return event.key === 'ArrowLeft' || event.keyCode === 37;
}

function isArrowRight(event: KeyboardEvent): boolean {
  return event.key === 'ArrowRight' || event.keyCode === 39;
}

export function isBold(event: KeyboardEvent): boolean {
  return event.key === 'b' && controlOrMeta(event);
}

export function isItalic(event: KeyboardEvent): boolean {
  return event.key === 'i' && controlOrMeta(event);
}

export function isUnderline(event: KeyboardEvent): boolean {
  return event.key === 'u' && controlOrMeta(event);
}

export function isParagraph(event: KeyboardEvent): boolean {
  return isEnter(event) && !event.shiftKey;
}

export function isLineBreak(event: KeyboardEvent): boolean {
  return isEnter(event) && event.shiftKey;
}

export function isDeleteWordBackward(event: KeyboardEvent): boolean {
  return isBackspace(event) && (IS_MAC ? event.altKey : event.ctrlKey);
}

export function isDeleteWordForward(event: KeyboardEvent): boolean {
  return isDelete(event) && (IS_MAC ? event.altKey : event.ctrlKey);
}

export function isDeleteLineBackward(event: KeyboardEvent): boolean {
  return IS_MAC && event.metaKey && isBackspace(event);
}

export function isDeleteLineForward(event: KeyboardEvent): boolean {
  return IS_MAC && event.metaKey && isDelete(event);
}

export function isDeleteBackward(event: KeyboardEvent): boolean {
  const {key, altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (altKey || metaKey) {
      return false;
    }
    return isBackspace(event) || (key === 'h' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isBackspace(event);
}

export function isDeleteForward(event: KeyboardEvent): boolean {
  const {key, shiftKey, altKey, metaKey, ctrlKey} = event;
  if (IS_APPLE) {
    if (shiftKey || altKey || metaKey) {
      return false;
    }
    return isDelete(event) || (key === 'd' && ctrlKey);
  }
  if (ctrlKey || altKey || metaKey) {
    return false;
  }
  return isDelete(event);
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
