/**
 * Copyright (c) Facebook, Inc. and its affiliates.
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
export type {TextFormatType} from './LexicalTextNode';
export type {LineBreakNode} from './LexicalLineBreakNode';
export type {RootNode} from './LexicalRootNode';
export type {ElementFormatType} from './LexicalElementNode';

import {createEditor} from './LexicalEditor';
import {$createTextNode, $isTextNode, TextNode} from './LexicalTextNode';
import {$isElementNode, ElementNode} from './LexicalElementNode';
import {$isRootNode} from './LexicalRootNode';
import {$createLineBreakNode, $isLineBreakNode} from './LexicalLineBreakNode';
import {DecoratorNode, $isDecoratorNode} from './LexicalDecoratorNode';
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
