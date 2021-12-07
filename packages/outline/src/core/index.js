/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type {
  OutlineEditor,
  EditorConfig,
  EditorThemeClasses,
  TextMutation,
  IntentionallyMarkedAsDirtyElement,
  CommandListenerEditorPriority,
  CommandListenerLowPriority,
  CommandListenerNormalPriority,
  CommandListenerHighPriority,
  CommandListenerCriticalPriority,
} from './OutlineEditor';
export type {EditorState, ParsedEditorState} from './OutlineEditorState';
export type {State} from './OutlineUpdates';
export type {NodeKey, OutlineNode, NodeMap} from './OutlineNode';
export type {ParsedNode, ParsedNodeMap} from './OutlineParsing';
export type {
  Selection,
  PointType as Point,
  ElementPointType as ElementPoint,
  TextPointType as TextPoint,
} from './OutlineSelection';
export type {OutlineRef, EditorStateRef} from './OutlineReference';
export type {TextFormatType} from './OutlineTextNode';
export type {LineBreakNode} from './OutlineLineBreakNode';
export type {RootNode} from './OutlineRootNode';

import {createEditor} from './OutlineEditor';
import {otlnCreateTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isElementNode, ElementNode} from './OutlineElementNode';
import {isRootNode} from './OutlineRootNode';
import {otlnCreateLineBreakNode, isLineBreakNode} from './OutlineLineBreakNode';
import {DecoratorNode, isDecoratorNode} from './OutlineDecoratorNode';
import {
  isLeafNode,
  pushLogEntry as log,
  $getRoot,
  $getNodeByKey,
  $clearSelection,
  getNearestNodeFromDOMNode,
  flushMutations,
  setSelection,
  setCompositionKey,
  getCompositionKey,
} from './OutlineUtils';
import {
  createEmptySelection as createSelection,
  $getSelection,
  getPreviousSelection,
} from './OutlineSelection';
import {createNodeFromParse} from './OutlineParsing';
import {createEditorStateRef, isEditorStateRef} from './OutlineReference';

export {
  createEditor,
  ElementNode,
  DecoratorNode,
  TextNode,
  // Ref
  createEditorStateRef,
  isEditorStateRef,
  // Node validation
  isLeafNode,
  isElementNode,
  isDecoratorNode,
  isLineBreakNode,
  isRootNode,
  isTextNode,
  // Used during read/update/transform
  otlnCreateLineBreakNode,
  otlnCreateTextNode,
  createNodeFromParse,
  createSelection,
  $getRoot,
  $getNodeByKey,
  $getSelection,
  getPreviousSelection,
  $clearSelection,
  setSelection,
  setCompositionKey,
  getCompositionKey,
  getNearestNodeFromDOMNode,
  flushMutations,
  log,
};
