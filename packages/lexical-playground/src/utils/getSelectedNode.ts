/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isAtNodeEnd} from '@lexical/selection';
import {
  $isNodeSelection,
  $isRangeSelection,
  BaseSelection,
  LexicalNode,
} from 'lexical';

export function getSelectedNode(
  selection: BaseSelection | null,
): LexicalNode | null {
  if (!selection) {
    return null;
  }

  if ($isRangeSelection(selection)) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    if (anchorNode === focusNode) {
      return anchorNode;
    }
    const isBackward = selection.isBackward();
    if (isBackward) {
      return $isAtNodeEnd(focus) ? anchorNode : focusNode;
    }

    return $isAtNodeEnd(anchor) ? anchorNode : focusNode;
  }

  if ($isNodeSelection(selection)) {
    const nodes = selection.getNodes();

    return nodes.length > 0 ? nodes[0] : null;
  }

  return null;
}
