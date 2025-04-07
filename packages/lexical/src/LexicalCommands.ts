/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand} from './LexicalEditor';
import type {LexicalNode} from './LexicalNode';
import type {BaseSelection} from './LexicalSelection';
import type {ElementFormatType} from './nodes/LexicalElementNode';
import type {TextFormatType} from './nodes/LexicalTextNode';

export type PasteCommandType = ClipboardEvent | InputEvent | KeyboardEvent;

/**
 * Creates a command object with a unique type identifier.
 * For built-in commands, the type is transformed to a numeric ID while preserving
 * the original type information for better debuggability.
 * For custom commands, the type remains a string.
 */
export function createCommand<T>(type?: string): LexicalCommand<T> {
  return {
    type: type ? COMMAND_TRANSFORM_TABLE[type] ?? type : type,
  };
}

/**
 * Command type string literals for built-in commands.
 * This ensures we don't have string duplicates and provides type safety.
 */
export const CommandTypes = {
  BLUR: 'BLUR_COMMAND',
  CAN_REDO: 'CAN_REDO_COMMAND',
  CAN_UNDO: 'CAN_UNDO_COMMAND',
  CLEAR_EDITOR: 'CLEAR_EDITOR_COMMAND',
  CLEAR_HISTORY: 'CLEAR_HISTORY_COMMAND',
  CLICK: 'CLICK_COMMAND',
  CONTROLLED_TEXT_INSERTION: 'CONTROLLED_TEXT_INSERTION_COMMAND',
  COPY: 'COPY_COMMAND',
  CUT: 'CUT_COMMAND',
  DELETE_CHARACTER: 'DELETE_CHARACTER_COMMAND',
  DELETE_LINE: 'DELETE_LINE_COMMAND',
  DELETE_WORD: 'DELETE_WORD_COMMAND',
  DRAGEND: 'DRAGEND_COMMAND',
  DRAGOVER: 'DRAGOVER_COMMAND',
  DRAGSTART: 'DRAGSTART_COMMAND',
  DROP: 'DROP_COMMAND',
  FOCUS: 'FOCUS_COMMAND',
  FORMAT_ELEMENT: 'FORMAT_ELEMENT_COMMAND',
  FORMAT_TEXT: 'FORMAT_TEXT_COMMAND',
  INDENT_CONTENT: 'INDENT_CONTENT_COMMAND',
  INSERT_LINE_BREAK: 'INSERT_LINE_BREAK_COMMAND',
  INSERT_PARAGRAPH: 'INSERT_PARAGRAPH_COMMAND',
  INSERT_TAB: 'INSERT_TAB_COMMAND',
  KEY_ARROW_DOWN: 'KEY_ARROW_DOWN_COMMAND',
  KEY_ARROW_LEFT: 'KEY_ARROW_LEFT_COMMAND',
  KEY_ARROW_RIGHT: 'KEY_ARROW_RIGHT_COMMAND',
  KEY_ARROW_UP: 'KEY_ARROW_UP_COMMAND',
  KEY_BACKSPACE: 'KEY_BACKSPACE_COMMAND',
  KEY_DELETE: 'KEY_DELETE_COMMAND',
  KEY_DOWN: 'KEY_DOWN_COMMAND',
  KEY_ENTER: 'KEY_ENTER_COMMAND',
  KEY_ESCAPE: 'KEY_ESCAPE_COMMAND',
  KEY_MODIFIER: 'KEY_MODIFIER_COMMAND',
  KEY_SPACE: 'KEY_SPACE_COMMAND',
  KEY_TAB: 'KEY_TAB_COMMAND',
  MOVE_TO_END: 'MOVE_TO_END',
  MOVE_TO_START: 'MOVE_TO_START',
  OUTDENT_CONTENT: 'OUTDENT_CONTENT_COMMAND',
  PASTE: 'PASTE_COMMAND',
  REDO: 'REDO_COMMAND',
  REMOVE_TEXT: 'REMOVE_TEXT_COMMAND',
  SELECTION_CHANGE: 'SELECTION_CHANGE_COMMAND',
  SELECTION_INSERT_CLIPBOARD_NODES: 'SELECTION_INSERT_CLIPBOARD_NODES_COMMAND',
  SELECT_ALL: 'SELECT_ALL_COMMAND',
  UNDO: 'UNDO_COMMAND',
} as const;

/**
 * Transform table for built-in commands that maps command strings to numeric IDs.
 * The numbers are assigned based on common usage and historical values for compatibility.
 */
export const COMMAND_TRANSFORM_TABLE: Record<string, number> = {
  BLUR_COMMAND: 44,
  CAN_REDO_COMMAND: 41,
  CAN_UNDO_COMMAND: 42,
  CLEAR_EDITOR_COMMAND: 39,
  CLEAR_HISTORY_COMMAND: 40,
  CLICK_COMMAND: 3,
  CONTROLLED_TEXT_INSERTION_COMMAND: 7,
  COPY_COMMAND: 36,
  CUT_COMMAND: 37,
  DELETE_CHARACTER_COMMAND: 4,
  DELETE_LINE_COMMAND: 11,
  DELETE_WORD_COMMAND: 10,
  DRAGEND_COMMAND: 35,
  DRAGOVER_COMMAND: 34,
  DRAGSTART_COMMAND: 33,
  DROP_COMMAND: 31,
  FOCUS_COMMAND: 43,
  FORMAT_ELEMENT_COMMAND: 32,
  FORMAT_TEXT_COMMAND: 12,
  INDENT_CONTENT_COMMAND: 29,
  INSERT_LINE_BREAK_COMMAND: 5,
  INSERT_PARAGRAPH_COMMAND: 6,
  INSERT_TAB_COMMAND: 28,
  KEY_ARROW_DOWN_COMMAND: 21,
  KEY_ARROW_LEFT_COMMAND: 18,
  KEY_ARROW_RIGHT_COMMAND: 16,
  KEY_ARROW_UP_COMMAND: 20,
  KEY_BACKSPACE_COMMAND: 24,
  KEY_DELETE_COMMAND: 26,
  KEY_DOWN_COMMAND: 15,
  KEY_ENTER_COMMAND: 22,
  KEY_ESCAPE_COMMAND: 25,
  KEY_MODIFIER_COMMAND: 45,
  KEY_SPACE_COMMAND: 23,
  KEY_TAB_COMMAND: 27,
  MOVE_TO_END: 17,
  MOVE_TO_START: 19,
  OUTDENT_CONTENT_COMMAND: 30,
  PASTE_COMMAND: 8,
  REDO_COMMAND: 14,
  REMOVE_TEXT_COMMAND: 9,
  SELECTION_CHANGE_COMMAND: 1,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND: 2,
  SELECT_ALL_COMMAND: 38,
  UNDO_COMMAND: 13,
};

// Export all built-in commands
export const SELECTION_CHANGE_COMMAND = createCommand<void>(
  CommandTypes.SELECTION_CHANGE,
);
export const SELECTION_INSERT_CLIPBOARD_NODES_COMMAND = createCommand<{
  nodes: Array<LexicalNode>;
  selection: BaseSelection;
}>(CommandTypes.SELECTION_INSERT_CLIPBOARD_NODES);
export const CLICK_COMMAND = createCommand<MouseEvent>(CommandTypes.CLICK);
export const DELETE_CHARACTER_COMMAND = createCommand<boolean>(
  CommandTypes.DELETE_CHARACTER,
);
export const INSERT_LINE_BREAK_COMMAND = createCommand<boolean>(
  CommandTypes.INSERT_LINE_BREAK,
);
export const INSERT_PARAGRAPH_COMMAND = createCommand<void>(
  CommandTypes.INSERT_PARAGRAPH,
);
export const CONTROLLED_TEXT_INSERTION_COMMAND = createCommand<
  InputEvent | string
>(CommandTypes.CONTROLLED_TEXT_INSERTION);
export const PASTE_COMMAND = createCommand<PasteCommandType>(
  CommandTypes.PASTE,
);
export const REMOVE_TEXT_COMMAND = createCommand<InputEvent | null>(
  CommandTypes.REMOVE_TEXT,
);
export const DELETE_WORD_COMMAND = createCommand<boolean>(
  CommandTypes.DELETE_WORD,
);
export const DELETE_LINE_COMMAND = createCommand<boolean>(
  CommandTypes.DELETE_LINE,
);
export const FORMAT_TEXT_COMMAND = createCommand<TextFormatType>(
  CommandTypes.FORMAT_TEXT,
);
export const UNDO_COMMAND = createCommand<void>(CommandTypes.UNDO);
export const REDO_COMMAND = createCommand<void>(CommandTypes.REDO);
export const KEY_DOWN_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_DOWN,
);
export const KEY_ARROW_RIGHT_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_ARROW_RIGHT,
);
export const MOVE_TO_END = createCommand<KeyboardEvent>(
  CommandTypes.MOVE_TO_END,
);
export const KEY_ARROW_LEFT_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_ARROW_LEFT,
);
export const MOVE_TO_START = createCommand<KeyboardEvent>(
  CommandTypes.MOVE_TO_START,
);
export const KEY_ARROW_UP_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_ARROW_UP,
);
export const KEY_ARROW_DOWN_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_ARROW_DOWN,
);
export const KEY_ENTER_COMMAND = createCommand<KeyboardEvent | null>(
  CommandTypes.KEY_ENTER,
);
export const KEY_SPACE_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_SPACE,
);
export const KEY_BACKSPACE_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_BACKSPACE,
);
export const KEY_ESCAPE_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_ESCAPE,
);
export const KEY_DELETE_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_DELETE,
);
export const KEY_TAB_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_TAB,
);
export const INSERT_TAB_COMMAND = createCommand<void>(CommandTypes.INSERT_TAB);
export const INDENT_CONTENT_COMMAND = createCommand<void>(
  CommandTypes.INDENT_CONTENT,
);
export const OUTDENT_CONTENT_COMMAND = createCommand<void>(
  CommandTypes.OUTDENT_CONTENT,
);
export const DROP_COMMAND = createCommand<DragEvent>(CommandTypes.DROP);
export const FORMAT_ELEMENT_COMMAND = createCommand<ElementFormatType>(
  CommandTypes.FORMAT_ELEMENT,
);
export const DRAGSTART_COMMAND = createCommand<DragEvent>(
  CommandTypes.DRAGSTART,
);
export const DRAGOVER_COMMAND = createCommand<DragEvent>(CommandTypes.DRAGOVER);
export const DRAGEND_COMMAND = createCommand<DragEvent>(CommandTypes.DRAGEND);
export const COPY_COMMAND = createCommand<
  ClipboardEvent | KeyboardEvent | null
>(CommandTypes.COPY);
export const CUT_COMMAND = createCommand<ClipboardEvent | KeyboardEvent | null>(
  CommandTypes.CUT,
);
export const SELECT_ALL_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.SELECT_ALL,
);
export const CLEAR_EDITOR_COMMAND = createCommand<void>(
  CommandTypes.CLEAR_EDITOR,
);
export const CLEAR_HISTORY_COMMAND = createCommand<void>(
  CommandTypes.CLEAR_HISTORY,
);
export const CAN_REDO_COMMAND = createCommand<boolean>(CommandTypes.CAN_REDO);
export const CAN_UNDO_COMMAND = createCommand<boolean>(CommandTypes.CAN_UNDO);
export const FOCUS_COMMAND = createCommand<FocusEvent>(CommandTypes.FOCUS);
export const BLUR_COMMAND = createCommand<FocusEvent>(CommandTypes.BLUR);
export const KEY_MODIFIER_COMMAND = createCommand<KeyboardEvent>(
  CommandTypes.KEY_MODIFIER,
);
