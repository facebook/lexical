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
  $createEmptyRangeSelection as $createRangeSelection,
  $getPreviousSelection,
  $getSelection,
  $isRangeSelection,
} from './LexicalSelection';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $isLeafNode,
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
} from './LexicalEditor';
export type {EditorState, ParsedEditorState} from './LexicalEditorState';
export type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
export type {ParsedNode, ParsedNodeMap} from './LexicalParsing';
export type {
  ElementPointType as ElementPoint,
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
  // Used during read/update/transform
  $createLineBreakNode,
  $createNodeFromParse,
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
  // Node validation
  $isLeafNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  createDecoratorArray,
  createDecoratorEditor,
  // Decorator state
  createDecoratorMap,
  createEditor,
  DecoratorNode,
  ElementNode,
  isDecoratorArray,
  isDecoratorEditor,
  isDecoratorMap,
  ParagraphNode,
  TextNode,
  VERSION,
};
