/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  createEditor,
} from './LexicalEditor';
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
import {$isDecoratorNode, DecoratorNode} from './nodes/LexicalDecoratorNode';
import {$isElementNode, ElementNode} from './nodes/LexicalElementNode';
import {$isGridCellNode, GridCellNode} from './nodes/LexicalGridCellNode';
import {$isGridNode, GridNode} from './nodes/LexicalGridNode';
import {$isGridRowNode, GridRowNode} from './nodes/LexicalGridRowNode';
import {
  $createLineBreakNode,
  $isLineBreakNode,
  LineBreakNode,
} from './nodes/LexicalLineBreakNode';
import {
  $createParagraphNode,
  $isParagraphNode,
  ParagraphNode,
} from './nodes/LexicalParagraphNode';
import {$isRootNode} from './nodes/LexicalRootNode';
import {$createTextNode, $isTextNode, TextNode} from './nodes/LexicalTextNode';

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
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  createEditor,
  DecoratorNode,
  ElementNode,
  GridCellNode,
  GridNode,
  GridRowNode,
  LineBreakNode,
  ParagraphNode,
  TextNode,
  VERSION,
};
export * from './LexicalCommands';
