/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType, LexicalCommand, TextFormatType} from 'lexical';

export function createCommand<T>(): LexicalCommand<T> {
  return {};
}

export const SELECTION_CHANGE_COMMAND: LexicalCommand<void> = createCommand();
export const CLICK_COMMAND: LexicalCommand<MouseEvent> = createCommand();
export const DELETE_CHARACTER_COMMAND: LexicalCommand<boolean> =
  createCommand();
export const INSERT_LINE_BREAK_COMMAND: LexicalCommand<boolean> =
  createCommand();
export const INSERT_PARAGRAPH_COMMAND: LexicalCommand<void> = createCommand();
export const CONTROLLED_TEXT_INSERTION_COMMAND: LexicalCommand<
  InputEvent | string
> = createCommand();
export const PASTE_COMMAND: LexicalCommand<
  ClipboardEvent | InputEvent | KeyboardEvent
> = createCommand();
export const REMOVE_TEXT_COMMAND: LexicalCommand<void> = createCommand();
export const DELETE_WORD_COMMAND: LexicalCommand<boolean> = createCommand();
export const DELETE_LINE_COMMAND: LexicalCommand<boolean> = createCommand();
export const FORMAT_TEXT_COMMAND: LexicalCommand<TextFormatType> =
  createCommand();
export const UNDO_COMMAND: LexicalCommand<void> = createCommand();
export const REDO_COMMAND: LexicalCommand<void> = createCommand();
export const KEY_ARROW_RIGHT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const MOVE_TO_END: LexicalCommand<KeyboardEvent> = createCommand();
export const KEY_ARROW_LEFT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const MOVE_TO_START: LexicalCommand<KeyboardEvent> = createCommand();
export const KEY_ARROW_UP_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const KEY_ARROW_DOWN_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const KEY_ENTER_COMMAND: LexicalCommand<KeyboardEvent | null> =
  createCommand();
export const KEY_SPACE_COMMAND: LexicalCommand<KeyboardEvent> = createCommand();
export const KEY_BACKSPACE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const KEY_ESCAPE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const KEY_DELETE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
export const KEY_TAB_COMMAND: LexicalCommand<KeyboardEvent> = createCommand();
export const INDENT_CONTENT_COMMAND: LexicalCommand<void> = createCommand();
export const OUTDENT_CONTENT_COMMAND: LexicalCommand<void> = createCommand();
export const DROP_COMMAND: LexicalCommand<DragEvent> = createCommand();
export const FORMAT_ELEMENT_COMMAND: LexicalCommand<ElementFormatType> =
  createCommand();
export const DRAGSTART_COMMAND: LexicalCommand<DragEvent> = createCommand();
export const DRAGOVER_COMMAND: LexicalCommand<DragEvent> = createCommand();
export const DRAGEND_COMMAND: LexicalCommand<DragEvent> = createCommand();
export const COPY_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent> =
  createCommand();
export const CUT_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent> =
  createCommand();
export const CLEAR_EDITOR_COMMAND: LexicalCommand<void> = createCommand();
export const CLEAR_HISTORY_COMMAND: LexicalCommand<void> = createCommand();
export const CAN_REDO_COMMAND: LexicalCommand<boolean> = createCommand();
export const CAN_UNDO_COMMAND: LexicalCommand<boolean> = createCommand();
export const FOCUS_COMMAND: LexicalCommand<FocusEvent> = createCommand();
export const BLUR_COMMAND: LexicalCommand<FocusEvent> = createCommand();
export const KEY_MODIFIER_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand();
