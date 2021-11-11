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
  DirtyChange,
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
export type {TextFormatType} from './OutlineTextNode';
export type {LineBreakNode} from './OutlineLineBreakNode';

import {createEditor} from './OutlineEditor';
import {createTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isBlockNode, BlockNode} from './OutlineBlockNode';
import {createRootNode, isRootNode, RootNode} from './OutlineRootNode';
import {createLineBreakNode, isLineBreakNode} from './OutlineLineBreakNode';
import {DecoratorNode, isDecoratorNode} from './OutlineDecoratorNode';
import {isLeafNode, pushLogEntry as log} from './OutlineUtils';
import {createEmptySelection as createSelection} from './OutlineSelection';
import {createNodeFromParse} from './OutlineParsing';

export {
  createSelection,
  createEditor,
  // Node factories
  createLineBreakNode,
  createRootNode,
  createTextNode,
  createNodeFromParse,
  // Node validation
  isLeafNode,
  isBlockNode,
  isDecoratorNode,
  isLineBreakNode,
  isRootNode,
  isTextNode,
  // Extensible nodes
  BlockNode,
  DecoratorNode,
  RootNode,
  TextNode,
  // Logging
  log,
};
