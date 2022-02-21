/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {VERSION} from './LexicalConstants';
import {createEditor} from './LexicalEditor';
import {$createNodeFromParse} from './LexicalParsing';
import {
  $createEmptyObjectSelection as $createNodeSelection,
  $createEmptyRangeSelection as $createRangeSelection,
  $getPreviousSelection,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
} from './LexicalSelection';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $isLeafNode,
  $nodesOfType,
  $setCompositionKey,
  $setSelection,
} from './LexicalUtils';
import {
  $isDecoratorNode,
  createDecoratorArray,
  createDecoratorEditor,
  createDecoratorMap,
  DecoratorNode,
  isDecoratorArray,
  isDecoratorEditor,
  isDecoratorMap,
} from './nodes/base/LexicalDecoratorNode';
import {$isElementNode, ElementNode} from './nodes/base/LexicalElementNode';
import {$isGridCellNode, GridCellNode} from './nodes/base/LexicalGridCellNode';
import {$isGridNode, GridNode} from './nodes/base/LexicalGridNode';
import {$isGridRowNode, GridRowNode} from './nodes/base/LexicalGridRowNode';
import {
  $createLineBreakNode,
  $isLineBreakNode,
} from './nodes/base/LexicalLineBreakNode';
import {
  $createParagraphNode,
  $isParagraphNode,
  ParagraphNode,
} from './nodes/base/LexicalParagraphNode';
import {$isRootNode} from './nodes/base/LexicalRootNode';
import {
  $createTextNode,
  $isTextNode,
  TextNode,
} from './nodes/base/LexicalTextNode';

export type {
  CommandListenerCriticalPriority,
  CommandListenerEditorPriority,
  CommandListenerHighPriority,
  CommandListenerLowPriority,
  CommandListenerNormalPriority,
  DOMConversionMap,
  EditorConfig,
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
  NodeMutation,
} from './LexicalEditor';
export type {EditorState, ParsedEditorState} from './LexicalEditorState';
export type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
export type {ParsedNode, ParsedNodeMap} from './LexicalParsing';
export type {
  ElementPointType as ElementPoint,
  NodeSelection,
  PointType as Point,
  RangeSelection,
  TextPointType as TextPoint,
} from './LexicalSelection';
export type {
  DecoratorArray,
  DecoratorEditor,
  DecoratorMap,
  DecoratorStateValue,
} from './nodes/base/LexicalDecoratorNode';
export type {ElementFormatType} from './nodes/base/LexicalElementNode';
export type {LineBreakNode} from './nodes/base/LexicalLineBreakNode';
export type {RootNode} from './nodes/base/LexicalRootNode';
export type {TextFormatType} from './nodes/base/LexicalTextNode';

export {
  $createLineBreakNode,
  $createNodeFromParse,
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isGridCellNode,
  $isGridNode,
  $isGridRowNode,
  $isLeafNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $nodesOfType,
  $setCompositionKey,
  $setSelection,
  createDecoratorArray,
  createDecoratorEditor,
  createDecoratorMap,
  createEditor,
  DecoratorNode,
  ElementNode,
  GridCellNode,
  GridNode,
  GridRowNode,
  isDecoratorArray,
  isDecoratorEditor,
  isDecoratorMap,
  ParagraphNode,
  TextNode,
  VERSION,
};
