/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementFormatType, LexicalCommand, TextFormatType } from 'lexical';
export type PasteCommandType = ClipboardEvent | InputEvent | KeyboardEvent;
export declare function createCommand<T>(type?: string): LexicalCommand<T>;
export declare const SELECTION_CHANGE_COMMAND: LexicalCommand<void>;
export declare const CLICK_COMMAND: LexicalCommand<MouseEvent>;
export declare const DELETE_CHARACTER_COMMAND: LexicalCommand<boolean>;
export declare const INSERT_LINE_BREAK_COMMAND: LexicalCommand<boolean>;
export declare const INSERT_PARAGRAPH_COMMAND: LexicalCommand<void>;
export declare const CONTROLLED_TEXT_INSERTION_COMMAND: LexicalCommand<InputEvent | string>;
export declare const PASTE_COMMAND: LexicalCommand<PasteCommandType>;
export declare const REMOVE_TEXT_COMMAND: LexicalCommand<InputEvent | null>;
export declare const DELETE_WORD_COMMAND: LexicalCommand<boolean>;
export declare const DELETE_LINE_COMMAND: LexicalCommand<boolean>;
export declare const FORMAT_TEXT_COMMAND: LexicalCommand<TextFormatType>;
export declare const UNDO_COMMAND: LexicalCommand<void>;
export declare const REDO_COMMAND: LexicalCommand<void>;
export declare const KEY_DOWN_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_ARROW_RIGHT_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const MOVE_TO_END: LexicalCommand<KeyboardEvent>;
export declare const KEY_ARROW_LEFT_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const MOVE_TO_START: LexicalCommand<KeyboardEvent>;
export declare const KEY_ARROW_UP_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_ARROW_DOWN_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_ENTER_COMMAND: LexicalCommand<KeyboardEvent | null>;
export declare const KEY_SPACE_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_BACKSPACE_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_ESCAPE_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_DELETE_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const KEY_TAB_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const INSERT_TAB_COMMAND: LexicalCommand<void>;
export declare const INDENT_CONTENT_COMMAND: LexicalCommand<void>;
export declare const OUTDENT_CONTENT_COMMAND: LexicalCommand<void>;
export declare const DROP_COMMAND: LexicalCommand<DragEvent>;
export declare const FORMAT_ELEMENT_COMMAND: LexicalCommand<ElementFormatType>;
export declare const DRAGSTART_COMMAND: LexicalCommand<DragEvent>;
export declare const DRAGOVER_COMMAND: LexicalCommand<DragEvent>;
export declare const DRAGEND_COMMAND: LexicalCommand<DragEvent>;
export declare const COPY_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent | null>;
export declare const CUT_COMMAND: LexicalCommand<ClipboardEvent | KeyboardEvent | null>;
export declare const SELECT_ALL_COMMAND: LexicalCommand<KeyboardEvent>;
export declare const CLEAR_EDITOR_COMMAND: LexicalCommand<void>;
export declare const CLEAR_HISTORY_COMMAND: LexicalCommand<void>;
export declare const CAN_REDO_COMMAND: LexicalCommand<boolean>;
export declare const CAN_UNDO_COMMAND: LexicalCommand<boolean>;
export declare const FOCUS_COMMAND: LexicalCommand<FocusEvent>;
export declare const BLUR_COMMAND: LexicalCommand<FocusEvent>;
export declare const KEY_MODIFIER_COMMAND: LexicalCommand<KeyboardEvent>;
