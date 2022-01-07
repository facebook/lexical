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
  TextMutation,
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
export type {LexicalRef, EditorStateRef} from './LexicalReference';
export type {TextFormatType} from './nodes/base/LexicalTextNode';
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
  DecoratorNode,
  $isDecoratorNode,
} from './nodes/base/LexicalDecoratorNode';
import {
  $isLeafNode,
  $pushLogEntry as $log,
  $getRoot,
  $getNodeByKey,
  $getNearestNodeFromDOMNode,
  $flushMutations,
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
import {createEditorStateRef, isEditorStateRef} from './LexicalReference';

export {
  VERSION,
  createEditor,
  ElementNode,
  DecoratorNode,
  TextNode,
  // Ref
  createEditorStateRef,
  isEditorStateRef,
  // Node validation
  $isLeafNode,
  $isElementNode,
  $isDecoratorNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
  // Used during read/update/transform
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
  $flushMutations,
  $log,
};
