/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PointType} from './LexicalSelection';

import {
  $isElementNode,
  $isTextNode,
  type RangeSelection,
  type TextNode,
} from '.';
import {nodeStatesAreEquivalent} from './LexicalNodeState';
import {getActiveEditor} from './LexicalUpdates';

function $canSimpleTextNodesBeMerged(
  node1: TextNode,
  node2: TextNode,
): boolean {
  const node1Mode = node1.__mode;
  const node1Format = node1.__format;
  const node1Style = node1.__style;
  const node2Mode = node2.__mode;
  const node2Format = node2.__format;
  const node2Style = node2.__style;
  const node1State = node1.__state;
  const node2State = node2.__state;
  return (
    (node1Mode === null || node1Mode === node2Mode) &&
    (node1Format === null || node1Format === node2Format) &&
    (node1Style === null || node1Style === node2Style) &&
    (node1.__state === null ||
      node1State === node2State ||
      nodeStatesAreEquivalent(node1State, node2State))
  );
}

function $mergeTextNodes(node1: TextNode, node2: TextNode): TextNode {
  const writableNode1 = node1.mergeWithSibling(node2);

  const normalizedNodes = getActiveEditor()._normalizedNodes;

  normalizedNodes.add(node1.__key);
  normalizedNodes.add(node2.__key);
  return writableNode1;
}

export function $normalizeTextNode(textNode: TextNode): void {
  let node = textNode;

  if (node.__text === '' && node.isSimpleText() && !node.isUnmergeable()) {
    node.remove();
    return;
  }

  // Backward
  let previousNode;

  while (
    (previousNode = node.getPreviousSibling()) !== null &&
    $isTextNode(previousNode) &&
    previousNode.isSimpleText() &&
    !previousNode.isUnmergeable()
  ) {
    if (previousNode.__text === '') {
      previousNode.remove();
    } else if ($canSimpleTextNodesBeMerged(previousNode, node)) {
      node = $mergeTextNodes(previousNode, node);
      break;
    } else {
      break;
    }
  }

  // Forward
  let nextNode;

  while (
    (nextNode = node.getNextSibling()) !== null &&
    $isTextNode(nextNode) &&
    nextNode.isSimpleText() &&
    !nextNode.isUnmergeable()
  ) {
    if (nextNode.__text === '') {
      nextNode.remove();
    } else if ($canSimpleTextNodesBeMerged(node, nextNode)) {
      node = $mergeTextNodes(node, nextNode);
      break;
    } else {
      break;
    }
  }
}

/**
 * Descends element-type anchor and focus points of a RangeSelection toward the
 * deepest text-type points, stopping at non-element leaf nodes.
 *
 * When `stopAtShadowRoot` is true the descent also stops before entering a
 * shadow root. A selection that spans a shadow root as a whole (a table, a
 * columns layout, …) is otherwise rewritten into a selection scoped inside it,
 * which makes "select the widget" and "select the text in the widget"
 * indistinguishable to the operations that follow.
 */
export function $normalizeSelection(
  selection: RangeSelection,
  stopAtShadowRoot: boolean = false,
): RangeSelection {
  $normalizePoint(selection.anchor, stopAtShadowRoot);
  $normalizePoint(selection.focus, stopAtShadowRoot);
  return selection;
}

function $normalizePoint(point: PointType, stopAtShadowRoot: boolean): void {
  while (point.type === 'element') {
    const node = point.getNode();
    const offset = point.offset;
    let nextNode;
    let nextOffsetAtEnd;
    if (offset === node.getChildrenSize()) {
      nextNode = node.getChildAtIndex(offset - 1);
      nextOffsetAtEnd = true;
    } else {
      nextNode = node.getChildAtIndex(offset);
      nextOffsetAtEnd = false;
    }
    if ($isTextNode(nextNode)) {
      point.set(
        nextNode.__key,
        nextOffsetAtEnd ? nextNode.getTextContentSize() : 0,
        'text',
        true,
      );
      break;
    } else if (!$isElementNode(nextNode)) {
      break;
    } else if (stopAtShadowRoot && nextNode.isShadowRoot()) {
      break;
    }
    point.set(
      nextNode.__key,
      nextOffsetAtEnd ? nextNode.getChildrenSize() : 0,
      'element',
      true,
    );
  }
}
