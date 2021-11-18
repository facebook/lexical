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
  NodeTypes,
} from './OutlineEditor';
export type {EditorState, ParsedEditorState} from './OutlineEditorState';
export type {State} from './OutlineUpdates';
export type {NodeKey, OutlineNode, NodeMap} from './OutlineNode';
export type {ParsedNode, ParsedNodeMap} from './OutlineParsing';
export type {
  Selection,
  PointType as Point,
  BlockPointType as BlockPoint,
  TextPointType as TextPoint,
} from './OutlineSelection';
export type {OutlineRef} from './OutlineReference';
export type {TextFormatType} from './OutlineTextNode';
export type {LineBreakNode} from './OutlineLineBreakNode';

import {createEditor} from './OutlineEditor';
import {createTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isBlockNode, BlockNode} from './OutlineBlockNode';
import {createRootNode, isRootNode, RootNode} from './OutlineRootNode';
import {createLineBreakNode, isLineBreakNode} from './OutlineLineBreakNode';
import {DecoratorNode, isDecoratorNode} from './OutlineDecoratorNode';
import {
  isLeafNode,
  pushLogEntry as log,
  getRoot,
  getNodeByKey,
  clearSelection,
  getNearestNodeFromDOMNode,
  flushMutations,
  setSelection,
  setCompositionKey,
  getCompositionKey,
} from './OutlineUtils';
import {
  createEmptySelection as createSelection,
  getSelection,
} from './OutlineSelection';
import {createNodeFromParse} from './OutlineParsing';
import {createEditorStateRef, isEditorStateRef} from './OutlineReference';

export {
  createEditor,
  BlockNode,
  DecoratorNode,
  RootNode,
  TextNode,
  // Ref
  createEditorStateRef,
  isEditorStateRef,
  // Node validation
  isLeafNode,
  isBlockNode,
  isDecoratorNode,
  isLineBreakNode,
  isRootNode,
  isTextNode,
  // Used during read/update/transform
  createLineBreakNode,
  createRootNode,
  createTextNode,
  createNodeFromParse,
  createSelection,
  getRoot,
  getNodeByKey,
  getSelection,
  clearSelection,
  setSelection,
  setCompositionKey,
  getCompositionKey,
  getNearestNodeFromDOMNode,
  flushMutations,
  log,
};
