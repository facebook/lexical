/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isAtNodeEnd} from '@lexical/selection';
import {
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  BaseSelection,
  DecoratorNode,
  ElementNode,
  TextNode,
} from 'lexical';

export function getSelectedNode<T>(
  selection: BaseSelection | null,
): TextNode | ElementNode | DecoratorNode<T> | null {
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
    const nodes = selection
      .getNodes()
      .filter(
        (n) => $isTextNode(n) || $isElementNode(n) || $isDecoratorNode<T>(n),
      );

    if (nodes.length === 0) {
      return null;
    }

    if (nodes.length === 1) {
      return nodes[0];
    }

    const isBackward = selection.isBackward();
    const n = isBackward ? nodes[nodes.length - 1] : nodes[0];

    return n;
  }

  return null;
}
