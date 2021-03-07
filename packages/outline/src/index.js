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
export type {NodeKey, ParsedNode, ParsedNodeMap} from './OutlineNode';
export type {Selection} from './OutlineSelection';
export type {TextFormatType} from './OutlineTextNode';

import {createEditor} from './OutlineEditor';
import {createTextNode, isTextNode, TextNode} from './OutlineTextNode';
import {isBlockNode, BlockNode} from './OutlineBlockNode';
import {isRootNode, RootNode} from './OutlineRootNode';
import {
  createLineBreakNode,
  isLineBreakNode,
  LineBreakNode,
} from './OutlineLineBreakNode';
import {OutlineNode} from './OutlineNode';

export {
  createEditor,
  createLineBreakNode,
  createTextNode,
  isTextNode,
  isBlockNode,
  isRootNode,
  isLineBreakNode,
  LineBreakNode,
  OutlineNode,
  BlockNode,
  RootNode,
  TextNode,
};
