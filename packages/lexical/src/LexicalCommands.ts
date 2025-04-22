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

export function createCommand<T>(type?: string): LexicalCommand<T> {
  return {type};
}

export const SELECTION_CHANGE_COMMAND: LexicalCommand<void> = createCommand(
  'SELECTION_CHANGE_COMMAND',
);
export const SELECTION_INSERT_CLIPBOARD_NODES_COMMAND: LexicalCommand<{
  nodes: Array<LexicalNode>;
  selection: BaseSelection;
}> = createCommand('SELECTION_INSERT_CLIPBOARD_NODES_COMMAND');
export const CLICK_COMMAND: LexicalCommand<MouseEvent> =
  createCommand('CLICK_COMMAND');
/**
 * Dispatched to delete a character, the payload will be `true` if the deletion
 * is backwards (backspace or delete on macOS) and `false` if forwards
 * (delete or Fn+Delete on macOS).
 */
export const DELETE_CHARACTER_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_CHARACTER_COMMAND',
);
/**
 * Dispatched to insert a line break. With a false payload the
 * cursor moves to the new line (Shift+Enter), with a true payload the cursor
 * does not move (Ctrl+O on macOS).
 */
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
export const REMOVE_TEXT_COMMAND: LexicalCommand<InputEvent | null> =
  createCommand('REMOVE_TEXT_COMMAND');
/**
 * Dispatched to delete a word, the payload will be `true` if the deletion is
 * backwards (Ctrl+Backspace or Opt+Delete on macOS), and `false` if
 * forwards (Ctrl+Delete or Fn+Opt+Delete on macOS).
 */
export const DELETE_WORD_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_WORD_COMMAND',
);
/**
 * Dispatched to delete a line, the payload will be `true` if the deletion is
 * backwards (Cmd+Delete on macOS), and `false` if forwards
 * (Fn+Cmd+Delete on macOS).
 */
export const DELETE_LINE_COMMAND: LexicalCommand<boolean> = createCommand(
  'DELETE_LINE_COMMAND',
);
/**
 * Dispatched to format the selected text.
 */
export const FORMAT_TEXT_COMMAND: LexicalCommand<TextFormatType> =
  createCommand('FORMAT_TEXT_COMMAND');
/**
 * Dispatched on undo (Cmd+Z on macOS, Ctrl+Z elsewhere).
 */
export const UNDO_COMMAND: LexicalCommand<void> = createCommand('UNDO_COMMAND');
/**
 * Dispatched on redo (Shift+Cmd+Z on macOS, Shift+Ctrl+Z or Ctrl+Y elsewhere).
 */
export const REDO_COMMAND: LexicalCommand<void> = createCommand('REDO_COMMAND');
/**
 * Dispatched when any key is pressed.
 */
export const KEY_DOWN_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEYDOWN_COMMAND');
/**
 * Dispatched when the `'ArrowRight'` key is pressed.
 * The shift modifier key may also be down.
 */
export const KEY_ARROW_RIGHT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_RIGHT_COMMAND');
/**
 * Dispatched when the move to end keyboard shortcut is pressed,
 * (Cmd+Right on macOS; Ctrl+Right elsewhere).
 */
export const MOVE_TO_END: LexicalCommand<KeyboardEvent> =
  createCommand('MOVE_TO_END');
/**
 * Dispatched when the `'ArrowLeft'` key is pressed.
 * The shift modifier key may also be down.
 */
export const KEY_ARROW_LEFT_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_LEFT_COMMAND');
/**
 * Dispatched when the move to start keyboard shortcut is pressed,
 * (Cmd+Left on macOS; Ctrl+Left elsewhere).
 */
export const MOVE_TO_START: LexicalCommand<KeyboardEvent> =
  createCommand('MOVE_TO_START');
/**
 * Dispatched when the `'ArrowUp'` key is pressed.
 * The shift and/or alt (option) modifier keys may also be down.
 */
export const KEY_ARROW_UP_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_UP_COMMAND');
/**
 * Dispatched when the `'ArrowUp'` key is pressed.
 * The shift and/or alt (option) modifier keys may also be down.
 */
export const KEY_ARROW_DOWN_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ARROW_DOWN_COMMAND');
/**
 * Dispatched when the enter key is pressed, may also be called with a null
 * payload when the intent is to insert a newline. The shift modifier key
 * must be down, any other modifier keys may also be down.
 */
export const KEY_ENTER_COMMAND: LexicalCommand<KeyboardEvent | null> =
  createCommand('KEY_ENTER_COMMAND');
/**
 * Dispatched whenever the space (`' '`) key is pressed, any modifier
 * keys may be down.
 */
export const KEY_SPACE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_SPACE_COMMAND');
/**
 * Dispatched whenever the `'Backspace'` key is pressed, the shift
 * modifier key may be down.
 */
export const KEY_BACKSPACE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_BACKSPACE_COMMAND');
/**
 * Dispatched whenever the `'Escape'` key is pressed, any modifier
 * keys may be down.
 */
export const KEY_ESCAPE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_ESCAPE_COMMAND');
/**
 * Dispatched whenever the `'Delete'` key is pressed (Fn+Delete on macOS).
 */
export const KEY_DELETE_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_DELETE_COMMAND');
/**
 * Dispatched whenever the `'Tab'` key is pressed. The shift modifier key
 * may be down.
 */
export const KEY_TAB_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_TAB_COMMAND');
export const INSERT_TAB_COMMAND: LexicalCommand<void> =
  createCommand('INSERT_TAB_COMMAND');
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
/**
 * Dispatched on a copy event, either via the clipboard or a KeyboardEvent
 * (Cmd+C on macOS, Ctrl+C elsewhere).
 */
export const COPY_COMMAND: LexicalCommand<
  ClipboardEvent | KeyboardEvent | null
> = createCommand('COPY_COMMAND');
/**
 * Dispatched on a cut event, either via the clipboard or a KeyboardEvent
 * (Cmd+X on macOS, Ctrl+X elsewhere).
 */
export const CUT_COMMAND: LexicalCommand<
  ClipboardEvent | KeyboardEvent | null
> = createCommand('CUT_COMMAND');
/**
 * Dispatched on the select all keyboard shortcut
 * (Cmd+A on macOS, Ctrl+A elsehwere).
 */
export const SELECT_ALL_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('SELECT_ALL_COMMAND');
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
/**
 * @deprecated in v0.31.0, use KEY_DOWN_COMMAND and check for modifiers
 * directly.
 *
 * Dispatched after any KeyboardEvent when modifiers are pressed
 */
export const KEY_MODIFIER_COMMAND: LexicalCommand<KeyboardEvent> =
  createCommand('KEY_MODIFIER_COMMAND');
