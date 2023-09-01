/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var clipboard = require('@lexical/clipboard');
var selection = require('@lexical/selection');
var utils = require('@lexical/utils');
var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const CAN_USE_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined' && typeof window.document.createElement !== 'undefined';

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const documentMode = CAN_USE_DOM && 'documentMode' in document ? document.documentMode : null;
CAN_USE_DOM && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);
const CAN_USE_BEFORE_INPUT = CAN_USE_DOM && 'InputEvent' in window && !documentMode ? 'getTargetRanges' in new window.InputEvent('input') : false;
const IS_SAFARI = CAN_USE_DOM && /Version\/[\d.]+.*Safari/.test(navigator.userAgent);
const IS_IOS = CAN_USE_DOM && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Keep these in case we need to use them in the future.
// export const IS_WINDOWS: boolean = CAN_USE_DOM && /Win/.test(navigator.platform);
const IS_CHROME = CAN_USE_DOM && /^(?=.*Chrome).*/i.test(navigator.userAgent);
// export const canUseTextInputEvent: boolean = CAN_USE_DOM && 'TextEvent' in window && !documentMode;

const IS_APPLE_WEBKIT = CAN_USE_DOM && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && !IS_CHROME;

/** @module @lexical/plain-text */
function onCopyForPlainText(event, editor) {
  editor.update(() => {
    if (event !== null) {
      const clipboardData = event instanceof KeyboardEvent ? null : event.clipboardData;
      const selection = lexical.$getSelection();
      if (selection !== null && clipboardData != null) {
        event.preventDefault();
        const htmlString = clipboard.$getHtmlContent(editor);
        if (htmlString !== null) {
          clipboardData.setData('text/html', htmlString);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}
function onPasteForPlainText(event, editor) {
  event.preventDefault();
  editor.update(() => {
    const selection = lexical.$getSelection();
    const {
      clipboardData
    } = event;
    if (clipboardData != null && lexical.$isRangeSelection(selection)) {
      clipboard.$insertDataTransferForPlainText(clipboardData, selection);
    }
  }, {
    tag: 'paste'
  });
}
function onCutForPlainText(event, editor) {
  onCopyForPlainText(event, editor);
  editor.update(() => {
    const selection = lexical.$getSelection();
    if (lexical.$isRangeSelection(selection)) {
      selection.removeText();
    }
  });
}
function registerPlainText(editor) {
  const removeListener = utils.mergeRegister(editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteCharacter(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_WORD_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteWord(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DELETE_LINE_COMMAND, isBackward => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.deleteLine(isBackward);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, eventOrText => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    if (typeof eventOrText === 'string') {
      selection.insertText(eventOrText);
    } else {
      const dataTransfer = eventOrText.dataTransfer;
      if (dataTransfer != null) {
        clipboard.$insertDataTransferForPlainText(dataTransfer, selection);
      } else {
        const data = eventOrText.data;
        if (data) {
          selection.insertText(data);
        }
      }
    }
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.removeText();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, selectStart => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertLineBreak(selectStart);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, () => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    selection.insertLineBreak();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_LEFT_COMMAND, payload => {
    const selection$1 = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    const event = payload;
    const isHoldingShift = event.shiftKey;
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, true)) {
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, true);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ARROW_RIGHT_COMMAND, payload => {
    const selection$1 = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection$1)) {
      return false;
    }
    const event = payload;
    const isHoldingShift = event.shiftKey;
    if (selection.$shouldOverrideDefaultCharacterSelection(selection$1, false)) {
      event.preventDefault();
      selection.$moveCharacter(selection$1, isHoldingShift, false);
      return true;
    }
    return false;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, true);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_DELETE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    event.preventDefault();
    return editor.dispatchCommand(lexical.DELETE_CHARACTER_COMMAND, false);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.KEY_ENTER_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    if (event !== null) {
      // If we have beforeinput, then we can avoid blocking
      // the default behavior. This ensures that the iOS can
      // intercept that we're actually inserting a paragraph,
      // and autocomplete, autocapitalize etc work as intended.
      // This can also cause a strange performance issue in
      // Safari, where there is a noticeable pause due to
      // preventing the key down of enter.
      if ((IS_IOS || IS_SAFARI || IS_APPLE_WEBKIT) && CAN_USE_BEFORE_INPUT) {
        return false;
      }
      event.preventDefault();
    }
    return editor.dispatchCommand(lexical.INSERT_LINE_BREAK_COMMAND, false);
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.SELECT_ALL_COMMAND, () => {
    lexical.$selectAll();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.COPY_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onCopyForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.CUT_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onCutForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.PASTE_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }
    onPasteForPlainText(event, editor);
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DROP_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }

    // TODO: Make drag and drop work at some point.
    event.preventDefault();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR), editor.registerCommand(lexical.DRAGSTART_COMMAND, event => {
    const selection = lexical.$getSelection();
    if (!lexical.$isRangeSelection(selection)) {
      return false;
    }

    // TODO: Make drag and drop work at some point.
    event.preventDefault();
    return true;
  }, lexical.COMMAND_PRIORITY_EDITOR));
  return removeListener;
}

exports.registerPlainText = registerPlainText;
