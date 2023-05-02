/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isDecoratorBlockNode} from '@lexical/react/LexicalDecoratorBlockNode';
import {$getNearestBlockElementAncestorOrThrow} from '@lexical/utils';
import {
  ElementFormatType,
  GridSelection,
  NodeSelection,
  RangeSelection,
} from 'lexical';

export function getSelectionFormat(
  selection: RangeSelection | NodeSelection | GridSelection,
): ElementFormatType {
  const nodes = selection.getNodes();
  const formatSet = new Set<ElementFormatType>();

  for (const node of nodes) {
    if ($isDecoratorBlockNode(node)) {
      formatSet.add(node.getFormat());
    } else {
      const element = $getNearestBlockElementAncestorOrThrow(node);
      formatSet.add(element.getFormatType());
    }
  }

  return formatSet.size === 1 ? formatSet.values().next().value : '';
}
