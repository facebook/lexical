/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementFormatType, LexicalCommand, TextFormatType} from 'lexical';

export type PasteCommandType = ClipboardEvent | InputEvent | KeyboardEvent;

export function createCommand<T>(type?: string): LexicalCommand<T> {
  return __DEV__ ? {type} : {};
}

export const SELECTION_CHANGE_COMMAND: LexicalCommand<void> = createCommand(
  'SELECTION_CHANGE_COMMAND',
);
export const CLICK_COMMAND: LexicalCommand<MouseEvent> =
  createCommand('CLICK_COMMAND');
export const DELETE_CHARACTER_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_CHARACTER_COMMAND',
);
export const INSERT_LINE_BREAK_COMMAND: LexicalCommand<boolean> = createCommand(
  'INSERT_LINE_BREAK_COMMAND',
);
export const INSERT_PARAGRAPH_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_PARAGRAPH_COMMAND',
);
export const CONTROLLED_TEXT_INSERTION_COMMAND: LexicalCommand<
  InputEvent | string
> = createCommand('CONTROLLED_TEXT_INSERTION_COMMAND');
export const PASTE_COMMAND: LexicalCommand<PasteCommandType> =
  createCommand('PASTE_COMMAND');
export const REMOVE_TEXT_COMMAND: LexicalCommand<void> = createCommand(
  'REMOVE_TEXT_COMMAND',
);
export const DELETE_WORD_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_WORD_COMMAND',
);
export const DELETE_LINE_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_LINE_COMMAND',
);
export const FORMAT_TEXT_COMMAND: LexicalCommand<TextFormatType> =
  createCommand('FORMAT_TEXT_COMMAND');
export const UNDO_COMMAND: LexicalCommand<void> = createCommand('UNDO_COMMAND');
export const REDO_COMMAND: LexicalCommand<void> = createCommand('REDO_COMMAND');
export const KEY_ARROW_RIGHT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_RIGHT_COMMAND');
export const MOVE_TO_END: LexicalCommand<KeyboardEvent> =
  createCommand('MOVE_TO_END');
export const KEY_ARROW_LEFT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_LEFT_COMMAND');
export const MOVE_TO_START: LexicalCommand<KeyboardEvent> =
  createCommand('MOVE_TO_START');
export const KEY_ARROW_UP_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_UP_COMMAND');
export const KEY_ARROW_DOWN_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_DOWN_COMMAND');
export const KEY_ENTER_COMMAND: LexicalCommand<KeyboardEvent | null> =
  createCommand('KEY_ENTER_COMMAND');
export const KEY_SPACE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_SPACE_COMMAND');
export const KEY_BACKSPACE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_BACKSPACE_COMMAND');
export const KEY_ESCAPE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ESCAPE_COMMAND');
export const KEY_DELETE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_DELETE_COMMAND');
export const KEY_TAB_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_TAB_COMMAND');
export const INDENT_CONTENT_COMMAND: LexicalCommand<void> = createCommand(
  'INDENT_CONTENT_COMMAND',
);
export const OUTDENT_CONTENT_COMMAND: LexicalCommand<void> = createCommand(
  'OUTDENT_CONTENT_COMMAND',
);
export const DROP_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DROP_COMMAND');
export const FORMAT_ELEMENT_COMMAND: LexicalCommand<ElementFormatType> =
  createCommand('FORMAT_ELEMENT_COMMAND');
export const DRAGSTART_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGSTART_COMMAND');
export const DRAGOVER_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGOVER_COMMAND');
export const DRAGEND_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGEND_COMMAND');
export const COPY_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent> =
  createCommand('COPY_COMMAND');
export const CUT_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent> =
  createCommand('CUT_COMMAND');
export const CLEAR_EDITOR_COMMAND: LexicalCommand<void> = createCommand(
  'CLEAR_EDITOR_COMMAND',
);
export const CLEAR_HISTORY_COMMAND: LexicalCommand<void> = createCommand(
  'CLEAR_HISTORY_COMMAND',
);
export const CAN_REDO_COMMAND: LexicalCommand<boolean> =
  createCommand('CAN_REDO_COMMAND');
export const CAN_UNDO_COMMAND: LexicalCommand<boolean> =
  createCommand('CAN_UNDO_COMMAND');
export const FOCUS_COMMAND: LexicalCommand<FocusEvent> =
  createCommand('FOCUS_COMMAND');
export const BLUR_COMMAND: LexicalCommand<FocusEvent> =
  createCommand('BLUR_COMMAND');
export const KEY_MODIFIER_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_MODIFIER_COMMAND');
