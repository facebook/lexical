/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalCommand} from 'lexical';

export function createCommand<T>(): LexicalCommand<T> {
  return Object.freeze({});
}

export const SELECTION_CHANGE_COMMAND: LexicalCommand<'selectionChange'> =
  createCommand<'selectionChange'>();
export const CLICK_COMMAND: LexicalCommand<'click'> = createCommand<'click'>();
export const DELETE_CHARACTER_COMMAND: LexicalCommand<'deleteCharacter'> =
  createCommand<'deleteCharacter'>();
export const INSERT_LINE_BREAK_COMMAND: LexicalCommand<'insertLinebreak'> =
  createCommand<'insertLinebreak'>();
export const INSERT_PARAGRAPH_COMMAND: LexicalCommand<'insertParagraph'> =
  createCommand<'insertParagraph'>();
export const INSERT_TEXT_COMMAND: LexicalCommand<'insertText'> =
  createCommand<'insertText'>();
export const PASTE_COMMAND: LexicalCommand<'paste'> = createCommand<'paste'>();
export const REMOVE_TEXT_COMMAND: LexicalCommand<'removeText'> =
  createCommand<'removeText'>();
export const DELETE_WORD_COMMAND: LexicalCommand<'deleteWord'> =
  createCommand<'deleteWord'>();
export const DELETE_LINE_COMMAND: LexicalCommand<'deleteLine'> =
  createCommand<'deleteLine'>();
export const FORMAT_TEXT_COMMAND: LexicalCommand<'formatText'> =
  createCommand<'formatText'>();
export const UNDO_COMMAND: LexicalCommand<'undo'> = createCommand<'undo'>();
export const REDO_COMMAND: LexicalCommand<'redo'> = createCommand<'redo'>();
export const KEY_ARROW_RIGHT_COMMAND: LexicalCommand<'keyArrowRight'> =
  createCommand<'keyArrowRight'>();
export const KEY_ARROW_LEFT_COMMAND: LexicalCommand<'keyArrowLeft'> =
  createCommand<'keyArrowLeft'>();
export const KEY_ARROW_UP_COMMAND: LexicalCommand<'keyArrowUp'> =
  createCommand<'keyArrowUp'>();
export const KEY_ARROW_DOWN_COMMAND: LexicalCommand<'keyArrowDown'> =
  createCommand<'keyArrowDown'>();
export const KEY_ENTER_COMMAND: LexicalCommand<'keyEnter'> =
  createCommand<'keyEnter'>();
export const KEY_BACKSPACE_COMMAND: LexicalCommand<'keyBackspace'> =
  createCommand<'keyBackspace'>();
export const KEY_ESCAPE_COMMAND: LexicalCommand<'keyEscape'> =
  createCommand<'keyEscape'>();
export const KEY_DELETE_COMMAND: LexicalCommand<'keyDelete'> =
  createCommand<'keyDelete'>();
export const KEY_TAB_COMMAND: LexicalCommand<'keyTab'> =
  createCommand<'keyTab'>();
export const INDENT_CONTENT_COMMAND: LexicalCommand<'indentContent'> =
  createCommand<'indentContent'>();
export const OUTDENT_CONTENT_COMMAND: LexicalCommand<'outdentContent'> =
  createCommand<'outdentContent'>();
export const DROP_COMMAND: LexicalCommand<'drop'> = createCommand<'drop'>();
export const FORMAT_ELEMENT_COMMAND: LexicalCommand<'formatElement'> =
  createCommand<'formatElement'>();
export const DRAGSTART_COMMAND: LexicalCommand<'dragstart'> =
  createCommand<'dragstart'>();
export const COPY_COMMAND: LexicalCommand<'copy'> = createCommand<'copy'>();
export const CUT_COMMAND: LexicalCommand<'cut'> = createCommand<'cut'>();
export const CLEAR_EDITOR_COMMAND: LexicalCommand<'clearEditor'> =
  createCommand<'clearEditor'>();
export const CLEAR_HISTORY_COMMAND: LexicalCommand<'clearHistory'> =
  createCommand<'clearHistory'>();
export const CAN_REDO_COMMAND: LexicalCommand<'canRedo'> =
  createCommand<'canRedo'>();
export const CAN_UNDO_COMMAND: LexicalCommand<'canUndo'> =
  createCommand<'canUndo'>();
export const CONNECTED_COMMAND: LexicalCommand<'connected'> =
  createCommand<'connected'>();
export const TOGGLE_CONNECT_COMMAND: LexicalCommand<'toggleConnect'> =
  createCommand<'toggleConnect'>();
export const FOCUS_COMMAND: LexicalCommand<'focus'> = createCommand<'focus'>();
export const BLUR_COMMAND: LexicalCommand<'blur'> = createCommand<'blur'>();
export const TOGGLE_LINK_COMMAND: LexicalCommand<'toggleLink'> =
  createCommand<'toggleLink'>();
export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<'insertHorizontalRule'> =
  createCommand<'insertHorizontalRule'>();
export const INSERT_IMAGE_COMMAND: LexicalCommand<'insertImage'> =
  createCommand<'insertImage'>();
export const INSERT_POLL_COMMAND: LexicalCommand<'insertPoll'> =
  createCommand<'insertPoll'>();
export const INSERT_TABLE_COMMAND: LexicalCommand<'insertTable'> =
  createCommand<'insertTable'>();
export const INSERT_EXCALIDRAW_COMMAND: LexicalCommand<'insertExcalidraw'> =
  createCommand<'insertExcalidraw'>();
export const INSERT_UNORDERED_LIST_COMMAND: LexicalCommand<'insertUnorderList'> =
  createCommand<'insertUnorderList'>();
export const INSERT_ORDERED_LIST_COMMAND: LexicalCommand<'insertOrderedList'> =
  createCommand<'insertOrderedList'>();
export const REMOVE_LIST_COMMAND: LexicalCommand<'removeList'> =
  createCommand<'removeList'>();
export const INSERT_TWEET_COMMAND: LexicalCommand<'insertTweet'> =
  createCommand<'insertTweet'>();
export const SPEECT_TO_TEXT_COMMAND: LexicalCommand<'speechToText'> =
  createCommand<'speechToText'>();
export const INSERT_EQUATION_COMMAND: LexicalCommand<'insertEquation'> =
  createCommand<'insertEquation'>();
export const READ_ONLY_COMMAND: LexicalCommand<'readOnly'> =
  createCommand<'readOnly'>();
