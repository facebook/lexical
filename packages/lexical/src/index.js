/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {createEditor} from './LexicalEditor';
import {$createNodeFromParse} from './LexicalParsing';
import {
  $createEmptyGridSelection as $createGridSelection,
  $createEmptyObjectSelection as $createNodeSelection,
  $createEmptyRangeSelection as $createRangeSelection,
  $getPreviousSelection,
  $getSelection,
  $isGridSelection,
  $isNodeSelection,
  $isRangeSelection,
} from './LexicalSelection';
import {
  $getDecoratorNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $isLeafNode,
  $nodesOfType,
  $setCompositionKey,
  $setSelection,
} from './LexicalUtils';
import {VERSION} from './LexicalVersion';
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
import {$isGridCellNode, GridCellNode} from './nodes/base/LexicalGridCellNode';
import {$isGridNode, GridNode} from './nodes/base/LexicalGridNode';
import {$isGridRowNode, GridRowNode} from './nodes/base/LexicalGridRowNode';
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

export {
  $createGridSelection,
  $createLineBreakNode,
  $createNodeFromParse,
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getDecoratorNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getPreviousSelection,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isGridCellNode,
  $isGridNode,
  $isGridRowNode,
  $isGridSelection,
  $isLeafNode,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $nodesOfType,
  $setCompositionKey,
  $setSelection,
  createDecoratorArray,
  createDecoratorEditor,
  createDecoratorMap,
  createEditor,
  DecoratorNode,
  ElementNode,
  GridCellNode,
  GridNode,
  GridRowNode,
  isDecoratorArray,
  isDecoratorEditor,
  isDecoratorMap,
  ParagraphNode,
  TextNode,
  VERSION,
};
