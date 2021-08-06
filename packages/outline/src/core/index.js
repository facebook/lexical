/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type {OutlineEditor, EditorThemeClasses} from './OutlineEditor';
export type {ViewModel, View, ParsedViewModel} from './OutlineView';
export type {
  NodeKey,
  ParsedNode,
  ParsedNodeMap,
  OutlineNode,
} from './OutlineNode';
export type {ParsedBlockNode} from './OutlineBlockNode';
export type {ParsedTextNode} from './OutlineTextNode';
export type {Selection} from './OutlineSelection';
export type {TextFormatType} from './OutlineTextNode';
export type {LineBreakNode} from './OutlineLineBreakNode';

import {createEditor} from './OutlineEditor';
import {createTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isBlockNode, BlockNode} from './OutlineBlockNode';
import {createRootNode, isRootNode, RootNode} from './OutlineRootNode';
import {createLineBreakNode, isLineBreakNode} from './OutlineLineBreakNode';
import {DecoratorNode, isDecoratorNode} from './OutlineDecoratorNode';

export {
  createEditor,
  // Node factories
  createLineBreakNode,
  createRootNode,
  createTextNode,
  // Node validation
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
