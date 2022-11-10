/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ICloneSelectionContent} from './lexical-node';

import {
  $getDecoratorNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isRootNode,
  $isRootOrShadowRoot,
  $isTextNode,
  ElementNode,
  GridSelection,
  LexicalNode,
  NodeKey,
  RangeSelection,
  TextNode,
} from 'lexical';

import {$cloneWithProperties} from './lexical-node';
import {getStyleObjectFromCSS} from './utils';

/**
 * Converts all nodes in the selection that are of one block type to another specified by parameter
 *
 * @param selection
 * @param createElement
 * @returns
 */
export function $setBlocksType(
  selection: RangeSelection | GridSelection,

  createElement: () => ElementNode,
): void {
  if (selection.anchor.key === 'root') {
    const element = createElement();
    const root = $getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild) {
      firstChild.replace(element);
      firstChild.getChildren().forEach((child: LexicalNode) => {
        element.append(child);
      });
    } else root.append(element);
    return;
  }

  const nodes = selection.getNodes();
  if (selection.anchor.type === 'text') {
    let firstBlock = selection.anchor.getNode().getParent() as LexicalNode;
    firstBlock = (
      firstBlock.isInline() ? firstBlock.getParent() : firstBlock
    ) as LexicalNode;
    if (nodes.indexOf(firstBlock) === -1) nodes.push(firstBlock);
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isBlock(node)) continue;
    const targetElement = createElement();
    targetElement.setFormat(node.getFormatType());
    targetElement.setIndent(node.getIndent());
    node.replace(targetElement);
  }
}

function isBlock(node: LexicalNode) {
  return (
    $isElementNode(node) &&
    !$isRootOrShadowRoot(node) &&
    $isRootOrShadowRoot(node.getParent())
  );
}

export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean {
  const possibleNode = $getDecoratorNode(selection.focus, isBackward);

  return $isDecoratorNode(possibleNode) && !possibleNode.isIsolated();
}

export function $moveCaretSelection(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

export function $isParentElementRTL(selection: RangeSelection): boolean {
  const anchorNode = selection.anchor.getNode();
  const parent = $isRootNode(anchorNode)
    ? anchorNode
    : anchorNode.getParentOrThrow();

  return parent.getDirection() === 'rtl';
}

export function $moveCharacter(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void {
  const isRTL = $isParentElementRTL(selection);
  $moveCaretSelection(
    selection,
    isHoldingShift,
    isBackward ? !isRTL : isRTL,
    'character',
  );
}

export function $selectAll(selection: RangeSelection): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const topParent = anchorNode.getTopLevelElementOrThrow();
  const root = topParent.getParentOrThrow();
  let firstNode = root.getFirstDescendant();
  let lastNode = root.getLastDescendant();
  let firstType: 'element' | 'text' = 'element';
  let lastType: 'element' | 'text' = 'element';
  let lastOffset = 0;

  if ($isTextNode(firstNode)) {
    firstType = 'text';
  } else if (!$isElementNode(firstNode) && firstNode !== null) {
    firstNode = firstNode.getParentOrThrow();
  }

  if ($isTextNode(lastNode)) {
    lastType = 'text';
    lastOffset = lastNode.getTextContentSize();
  } else if (!$isElementNode(lastNode) && lastNode !== null) {
    lastNode = lastNode.getParentOrThrow();
  }

  if (firstNode && lastNode) {
    anchor.set(firstNode.getKey(), 0, firstType);
    focus.set(lastNode.getKey(), lastOffset, lastType);
  }
}

function $getIndexFromPossibleClone(
  node: LexicalNode,
  parent: ElementNode,
  nodeMap: Map<NodeKey, LexicalNode>,
): number {
  const parentClone = nodeMap.get(parent.getKey());

  if ($isElementNode(parentClone)) {
    return parentClone.__children.indexOf(node.getKey());
  }

  return node.getIndexWithinParent();
}

function $getParentAvoidingExcludedElements(
  node: LexicalNode,
): ElementNode | null {
  let parent = node.getParent();

  while (parent !== null && parent.excludeFromCopy('clone')) {
    parent = parent.getParent();
  }

  return parent;
}

function $copyLeafNodeBranchToRoot(
  leaf: LexicalNode,
  startingOffset: number | undefined,
  endingOffset: number | undefined,
  isLeftSide: boolean,
  range: Array<NodeKey>,
  nodeMap: Map<NodeKey, LexicalNode>,
): void {
  let node = leaf;
  let offset = startingOffset;

  while (node !== null) {
    const parent = $getParentAvoidingExcludedElements(node);

    if (parent === null) {
      break;
    }

    if (!$isElementNode(node) || !node.excludeFromCopy('clone')) {
      const key = node.getKey();
      let clone = nodeMap.get(key);
      const needsClone = clone === undefined;

      if (needsClone) {
        clone = $cloneWithProperties<LexicalNode>(node);
        nodeMap.set(key, clone);
      }

      if ($isTextNode(clone) && !clone.isSegmented() && !clone.isToken()) {
        clone.__text = clone.__text.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? endingOffset : offset,
        );
      } else if ($isElementNode(clone)) {
        clone.__children = clone.__children.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? undefined : (offset || 0) + 1,
        );
      }

      if ($isRootNode(parent)) {
        if (needsClone) {
          // We only want to collect a range of top level nodes.
          // So if the parent is the root, we know this is a top level.
          range.push(key);
        }

        break;
      }
    }

    offset = $getIndexFromPossibleClone(node, parent, nodeMap);
    node = parent;
  }
}

export function $cloneRangeSelectionContent(
  selection: RangeSelection,
): ICloneSelectionContent {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const [anchorOffset, focusOffset] = selection.getCharacterOffsets();
  const nodes = selection.getNodes();

  if (nodes.length === 0) {
    return {
      nodeMap: [],
      range: [],
    };
  }

  // Check if we can use the parent of the nodes, if the
  // parent can't be empty, then it's important that we
  // also copy that element node along with its children.
  let nodesLength = nodes.length;
  const firstNode = nodes[0];
  const firstNodeParent = firstNode.getParent();

  if (
    firstNodeParent !== null &&
    (!firstNodeParent.canBeEmpty() || $isRootNode(firstNodeParent))
  ) {
    const parentChildren = firstNodeParent.__children;
    const parentChildrenLength = parentChildren.length;

    if (parentChildrenLength === nodesLength) {
      let areTheSame = true;

      for (let i = 0; i < parentChildren.length; i++) {
        if (parentChildren[i] !== nodes[i].__key) {
          areTheSame = false;
          break;
        }
      }

      if (areTheSame) {
        nodesLength++;
        nodes.push(firstNodeParent);
      }
    }
  }

  const lastNode = nodes[nodesLength - 1];
  const isBefore = anchor.isBefore(focus);
  const nodeMap = new Map();
  const range: Array<NodeKey> = [];
  const isOnlyText = $isTextNode(firstNode) && nodesLength === 1;

  // Do first node to root
  $copyLeafNodeBranchToRoot(
    firstNode,
    isBefore ? anchorOffset : focusOffset,
    isOnlyText ? (isBefore ? focusOffset : anchorOffset) : undefined,
    true,
    range,
    nodeMap,
  );

  // Copy all nodes between
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    const key = node.getKey();

    if (
      !nodeMap.has(key) &&
      (!$isElementNode(node) || !node.excludeFromCopy('clone'))
    ) {
      const clone = $cloneWithProperties<LexicalNode>(node);

      if ($isRootNode(node.getParent())) {
        range.push(node.getKey());
      }

      if (key !== 'root') {
        nodeMap.set(key, clone);
      }
    }
  }

  // Do last node to root
  $copyLeafNodeBranchToRoot(
    lastNode,
    isOnlyText ? undefined : isBefore ? focusOffset : anchorOffset,
    undefined,
    false,
    range,
    nodeMap,
  );

  return {
    nodeMap: Array.from(nodeMap.entries()),
    range,
  };
}

function $getNodeStyleValueForProperty(
  node: TextNode,
  styleProperty: string,
  defaultValue: string,
): string {
  const css = node.getStyle();
  const styleObject = getStyleObjectFromCSS(css);

  if (styleObject !== null) {
    return styleObject[styleProperty] || defaultValue;
  }

  return defaultValue;
}

export function $getSelectionStyleValueForProperty(
  selection: RangeSelection,
  styleProperty: string,
  defaultValue = '',
): string {
  let styleValue = null;
  const nodes = selection.getNodes();
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBackward = selection.isBackward();
  const endOffset = isBackward ? focus.offset : anchor.offset;
  const endNode = isBackward ? focus.getNode() : anchor.getNode();

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // if no actual characters in the end node are selected, we don't
    // include it in the selection for purposes of determining style
    // value
    if (i !== 0 && endOffset === 0 && node.is(endNode)) {
      continue;
    }

    if ($isTextNode(node)) {
      const nodeStyleValue = $getNodeStyleValueForProperty(
        node,
        styleProperty,
        defaultValue,
      );

      if (styleValue === null) {
        styleValue = nodeStyleValue;
      } else if (styleValue !== nodeStyleValue) {
        // multiple text nodes are in the selection and they don't all
        // have the same font size.
        styleValue = '';
        break;
      }
    }
  }

  return styleValue === null ? defaultValue : styleValue;
}
