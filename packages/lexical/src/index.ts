/** @module lexical */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type {PasteCommandType} from './LexicalCommands';
export type {
  CommandListenerPriority,
  CommandPayloadType,
  EditableListener,
  EditorConfig,
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
  Klass,
  LexicalCommand,
  LexicalEditor,
  MutationListener,
  NodeMutation,
  SerializedEditor,
  Spread,
} from './LexicalEditor';
export type {EditorState, SerializedEditorState} from './LexicalEditorState';
export type {
  DOMChildConversion,
  DOMConversion,
  DOMConversionFn,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalNode,
  NodeKey,
  NodeMap,
  SerializedLexicalNode,
} from './LexicalNode';
export type {
  BaseSelection,
  ElementPointType as ElementPoint,
  GridSelection,
  GridSelectionShape,
  NodeSelection,
  Point,
  RangeSelection,
  TextPointType as TextPoint,
} from './LexicalSelection';
export type {
  ElementFormatType,
  SerializedElementNode,
} from './nodes/LexicalElementNode';
export type {SerializedGridCellNode} from './nodes/LexicalGridCellNode';
export type {SerializedRootNode} from './nodes/LexicalRootNode';
export type {
  SerializedTextNode,
  TextFormatType,
  TextModeType,
} from './nodes/LexicalTextNode';

// TODO Move this somewhere else and/or recheck if we still need this
export {
  BLUR_COMMAND,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_EDITOR_COMMAND,
  CLEAR_HISTORY_COMMAND,
  CLICK_COMMAND,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  createCommand,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGEND_COMMAND,
  DRAGOVER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  FOCUS_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_MODIFIER_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  MOVE_TO_END,
  MOVE_TO_START,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  REDO_COMMAND,
  REMOVE_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
} from './LexicalCommands';
export {
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  createEditor,
} from './LexicalEditor';
export type {EventHandler} from './LexicalEvents';
export {$normalizeSelection as $normalizeSelection__EXPERIMENTAL} from './LexicalNormalization';
export {
  $createNodeSelection,
  $createRangeSelection,
  $getPreviousSelection,
  $getSelection,
  $getTextContent,
  $insertNodes,
  $isNodeSelection,
  $isRangeSelection,
  DEPRECATED_$createGridSelection,
  DEPRECATED_$isGridSelection,
} from './LexicalSelection';
export {$parseSerializedNode} from './LexicalUpdates';
export {
  $addUpdateTag,
  $getDecoratorNode,
  $getNearestNodeFromDOMNode,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $hasAncestor,
  $isInlineElementOrDecoratorNode,
  $isLeafNode,
  $isRootOrShadowRoot,
  $nodesOfType,
  $setCompositionKey,
  $setSelection,
} from './LexicalUtils';
export {VERSION} from './LexicalVersion';
export {$isDecoratorNode, DecoratorNode} from './nodes/LexicalDecoratorNode';
export {$isElementNode, ElementNode} from './nodes/LexicalElementNode';
export {
  DEPRECATED_$isGridCellNode,
  DEPRECATED_GridCellNode,
} from './nodes/LexicalGridCellNode';
export {
  DEPRECATED_$isGridNode,
  DEPRECATED_GridNode,
} from './nodes/LexicalGridNode';
export {
  DEPRECATED_$isGridRowNode,
  DEPRECATED_GridRowNode,
} from './nodes/LexicalGridRowNode';
export type {SerializedLineBreakNode} from './nodes/LexicalLineBreakNode';
export {
  $createLineBreakNode,
  $isLineBreakNode,
  LineBreakNode,
} from './nodes/LexicalLineBreakNode';
export type {SerializedParagraphNode} from './nodes/LexicalParagraphNode';
export {
  $createParagraphNode,
  $isParagraphNode,
  ParagraphNode,
} from './nodes/LexicalParagraphNode';
export {$isRootNode, RootNode} from './nodes/LexicalRootNode';
export {$createTextNode, $isTextNode, TextNode} from './nodes/LexicalTextNode';
