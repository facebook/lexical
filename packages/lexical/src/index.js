/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type {
  LexicalEditor,
  EditorConfig,
  EditorThemeClasses,
  IntentionallyMarkedAsDirtyElement,
  CommandListenerEditorPriority,
  CommandListenerLowPriority,
  CommandListenerNormalPriority,
  CommandListenerHighPriority,
  CommandListenerCriticalPriority,
  DOMConversionMap,
} from './LexicalEditor';
export type {EditorState, ParsedEditorState} from './LexicalEditorState';
export type {NodeKey, LexicalNode, NodeMap} from './LexicalNode';
export type {ParsedNode, ParsedNodeMap} from './LexicalParsing';
export type {
  Selection,
  PointType as Point,
  ElementPointType as ElementPoint,
  TextPointType as TextPoint,
} from './LexicalSelection';
export type {
  DecoratorMap,
  DecoratorEditor,
  DecoratorStateValue,
} from './nodes/base/LexicalDecoratorNode';
export type {TextFormatType} from './nodes/base/LexicalTextNode';
export type {HorizontalRuleNode} from './nodes/base/LexicalHorizontalRuleNode';
export type {LineBreakNode} from './nodes/base/LexicalLineBreakNode';
export type {RootNode} from './nodes/base/LexicalRootNode';
export type {ElementFormatType} from './nodes/base/LexicalElementNode';

import {VERSION} from './LexicalConstants';
import {createEditor} from './LexicalEditor';
import {
  $createTextNode,
  $isTextNode,
  TextNode,
} from './nodes/base/LexicalTextNode';
import {$isElementNode, ElementNode} from './nodes/base/LexicalElementNode';
import {$isRootNode} from './nodes/base/LexicalRootNode';
import {
  $createLineBreakNode,
  $isLineBreakNode,
} from './nodes/base/LexicalLineBreakNode';
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from './nodes/base/LexicalHorizontalRuleNode';
import {
  DecoratorNode,
  $isDecoratorNode,
  createDecoratorMap,
  createDecoratorEditor,
  isDecoratorMap,
  isDecoratorEditor,
} from './nodes/base/LexicalDecoratorNode';
import {
  $isLeafNode,
  $pushLogEntry as $log,
  $getRoot,
  $getNodeByKey,
  $getNearestNodeFromDOMNode,
  $setSelection,
  $setCompositionKey,
  $getCompositionKey,
} from './LexicalUtils';
import {
  $createEmptySelection as $createSelection,
  $getSelection,
  $getPreviousSelection,
} from './LexicalSelection';
import {$createNodeFromParse} from './LexicalParsing';

export {
  VERSION,
  createEditor,
  ElementNode,
  DecoratorNode,
  TextNode,
  // Decorator state
  createDecoratorMap,
  createDecoratorEditor,
  isDecoratorMap,
  isDecoratorEditor,
  // Node validation
  $isLeafNode,
  $isElementNode,
  $isDecoratorNode,
  $isHorizontalRuleNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
  // Used during read/update/transform
  $createHorizontalRuleNode,
  $createLineBreakNode,
  $createTextNode,
  $createNodeFromParse,
  $createSelection,
  $getRoot,
  $getNodeByKey,
  $getSelection,
  $getPreviousSelection,
  $setSelection,
  $setCompositionKey,
  $getCompositionKey,
  $getNearestNodeFromDOMNode,
  $log,
};
