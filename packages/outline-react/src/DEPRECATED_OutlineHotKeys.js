/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// Disclaimer: this logic was adapted from Slate (MIT) + is-hotkey (MIT):
// https://github.com/ianstormtaylor/slate/blob/master/packages/slate-react/src/utils/hotkeys.ts
// https://github.com/ianstormtaylor/is-hotkey/blob/master/src/index.js

import {IS_APPLE, IS_MAC} from './OutlineEnv';

const modifiers: {[key: string]: string} = {
  alt: 'altKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  shift: 'shiftKey',
};

const keyAliases: {[key: string]: string} = {
  add: '+',
  break: 'pause',
  cmd: 'meta',
  command: 'meta',
  ctl: 'control',
  ctrl: 'control',
  del: 'delete',
  down: 'arrowdown',
  esc: 'escape',
  ins: 'insert',
  left: 'arrowleft',
  mod: IS_MAC ? 'meta' : 'control',
  opt: 'alt',
  option: 'alt',
  return: 'enter',
  right: 'arrowright',
  space: ' ',
  spacebar: ' ',
  up: 'arrowup',
  win: 'meta',
  windows: 'meta',
};

const keyCodes: {[key: string]: number} = {
  backspace: 8,
  tab: 9,
  enter: 13,
  shift: 16,
  control: 17,
  alt: 18,
  pause: 19,
  capslock: 20,
  escape: 27,
  ' ': 32,
  pageup: 33,
  pagedown: 34,
  end: 35,
  home: 36,
  arrowleft: 37,
  arrowup: 38,
  arrowright: 39,
  arrowdown: 40,
  insert: 45,
  delete: 46,
  meta: 91,
  numlock: 144,
  scrolllock: 145,
  ';': 186,
  '=': 187,
  ',': 188,
  '-': 189,
  '.': 190,
  '/': 191,
  '`': 192,
  '[': 219,
  '\\': 220,
  ']': 221,
  "'": 222,
};

const hotkeys: {[string]: string | Array<string>} = {
  bold: 'mod+b',
  compose: ['down', 'left', 'right', 'up', 'backspace', 'enter'],
  deleteBackward: 'shift?+backspace',
  deleteForward: 'shift?+delete',
  extendBackward: 'shift+left',
  extendForward: 'shift+right',
  italic: 'mod+i',
  lineBreak: 'shift+enter',
  paragraph: 'enter',
  undo: 'mod+z',
};

const appleHotkeys = {
  deleteBackward: ['ctrl+backspace', 'ctrl+h'],
  deleteForward: ['ctrl+delete', 'ctrl+d'],
  deleteLineBackward: 'cmd+shift?+backspace',
  deleteLineForward: ['cmd+shift?+delete', 'ctrl+k'],
  deleteWordBackward: 'opt+shift?+backspace',
  deleteWordForward: 'opt+shift?+delete',
  extendLineBackward: 'opt+shift+up',
  extendLineForward: 'opt+shift+down',
  redo: 'cmd+shift+z',
  transposeCharacter: 'ctrl+t',
};

const windowsHotkeys = {
  deleteWordBackward: 'ctrl+shift?+backspace',
  deleteWordForward: 'ctrl+shift?+delete',
  redo: ['ctrl+y', 'ctrl+shift+z'],
};

function compareHotkey(object, event: Object) {
  for (const key in object) {
    const expected = object[key];
    let actual;

    if (expected == null) {
      continue;
    }

    if (key === 'key' && event.key != null) {
      actual = event.key.toLowerCase();
    } else if (key === 'which') {
      actual = expected === 91 && event.which === 93 ? 91 : event.which;
    } else {
      actual = event[key];
    }

    if (actual == null && expected === false) {
      continue;
    }

    if (actual !== expected) {
      return false;
    }
  }

  return true;
}

function toKeyCode(name) {
  name = toKeyName(name);
  const code = keyCodes[name] || name.toUpperCase().charCodeAt(0);
  return code;
}

function toKeyName(name) {
  name = name.toLowerCase();
  name = keyAliases[name] || name;
  return name;
}

function parseHotkey(hotkey, options) {
  const byKey = options && options.byKey;
  const ret = {};

  // Special case to handle the `+` key since we use it as a separator.
  hotkey = hotkey.replace('++', '+add');
  const values = hotkey.split('+');
  const {length} = values;

  // Ensure that all the modifiers are set to false unless the hotkey has them.
  for (const k in modifiers) {
    ret[modifiers[k]] = false;
  }

  for (let i = 0; i < values.length; i++) {
    let value = values[i];
    const optional = value.endsWith('?') && value.length > 1;

    if (optional) {
      value = value.slice(0, -1);
    }

    const name = toKeyName(value);
    const modifier = modifiers[name];

    if (length === 1 || !modifier) {
      if (byKey) {
        ret.key = name;
      } else {
        ret.which = toKeyCode(value);
      }
    }

    if (modifier) {
      ret[modifier] = optional ? null : true;
    }
  }

  return ret;
}

function isHotkey(hotkey, options: {byKey: boolean} | null, event) {
  if (options && !('byKey' in options)) {
    event = options;
    options = null;
  }

  if (!Array.isArray(hotkey)) {
    hotkey = [hotkey];
  }

  const array = hotkey.map((string) => parseHotkey(string, options));
  const check = (e) => array.some((object) => compareHotkey(object, e));
  const ret = event == null ? check : check(event);
  return ret;
}

function isKeyHotkey(hotkey, event) {
  return isHotkey(hotkey, {byKey: true}, event);
}

const createHotKey = (key: string): ((event: KeyboardEvent) => boolean) => {
  const generic = hotkeys[key];
  const apple = appleHotkeys[key];
  const windows = windowsHotkeys[key];
  const isGeneric: Function = generic && isKeyHotkey(generic);
  const isApple: Function = apple && isKeyHotkey(apple);
  const isWindows: Function = windows && isKeyHotkey(windows);

  return (event: KeyboardEvent) => {
    if (isGeneric && isGeneric(event)) return true;
    if (IS_APPLE && isApple && isApple(event)) return true;
    if (!IS_APPLE && isWindows && isWindows(event)) return true;
    return false;
  };
};

export const isBold: (event: Object) => boolean = createHotKey('bold');
export const isDeleteBackward: (event: Object) => boolean = createHotKey(
  'deleteBackward',
);
export const isDeleteForward: (event: Object) => boolean = createHotKey(
  'deleteForward',
);
export const isDeleteLineBackward: (event: Object) => boolean = createHotKey(
  'deleteLineBackward',
);
export const isDeleteLineForward: (event: Object) => boolean = createHotKey(
  'deleteLineForward',
);
export const isDeleteWordBackward: (event: Object) => boolean = createHotKey(
  'deleteWordBackward',
);
export const isDeleteWordForward: (event: Object) => boolean = createHotKey(
  'deleteWordForward',
);
export const isExtendBackward: (event: Object) => boolean = createHotKey(
  'extendBackward',
);
export const isExtendForward: (event: Object) => boolean = createHotKey(
  'extendForward',
);
export const isExtendLineBackward: (event: Object) => boolean = createHotKey(
  'extendLineBackward',
);
export const isExtendLineForward: (event: Object) => boolean = createHotKey(
  'extendLineForward',
);
export const isItalic: (event: Object) => boolean = createHotKey('italic');
export const isRedo: (event: Object) => boolean = createHotKey('redo');
export const isLineBreak: (event: Object) => boolean = createHotKey(
  'lineBreak',
);
export const isParagraph: (event: Object) => boolean = createHotKey(
  'paragraph',
);
export const isTransposeCharacter: (event: Object) => boolean = createHotKey(
  'transposeCharacter',
);
export const isUndo: (event: Object) => boolean = createHotKey('undo');
