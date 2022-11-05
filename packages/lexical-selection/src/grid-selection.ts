/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ICloneSelectionContent} from './lexical-node';
import type {GridSelection, LexicalNode, NodeKey} from 'lexical';

import {$cloneWithProperties} from './lexical-node';

export function $cloneGridSelectionContent(
  selection: GridSelection,
): ICloneSelectionContent {
  const nodeMap = selection.getNodes().map<[NodeKey, LexicalNode]>((node) => {
    const nodeKey = node.getKey();

    const clone = $cloneWithProperties<LexicalNode>(node);

    return [nodeKey, clone];
  });

  return {
    nodeMap,
    range: [selection.gridKey],
  };
}
