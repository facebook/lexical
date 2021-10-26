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
} from './OutlineEditor';
export type {ViewModel, ParsedViewModel} from './OutlineViewModel';
export type {View} from './OutlineUpdates';
export type {
  NodeKey,
  OutlineNode,
  NodeMap,
} from './OutlineNode';
export type {
  ParsedNode,
  ParsedNodeMap,
} from './OutlineParsing';
export type {
  Selection,
  PointType as Point,
  BlockPointType as BlockPoint,
  TextPointType as TextPoint,
} from './OutlineSelection';
export type {TextFormatType} from './OutlineTextNode';
export type {LineBreakNode} from './OutlineLineBreakNode';

import {createEditor, getEditorFromElement} from './OutlineEditor';
import {createTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isBlockNode, BlockNode} from './OutlineBlockNode';
import {createRootNode, isRootNode, RootNode} from './OutlineRootNode';
import {createLineBreakNode, isLineBreakNode} from './OutlineLineBreakNode';
import {DecoratorNode, isDecoratorNode} from './OutlineDecoratorNode';
import {isLeafNode} from './OutlineUtils';

export {
  createEditor,
  getEditorFromElement,
  // Node factories
  createLineBreakNode,
  createRootNode,
  createTextNode,
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
};
