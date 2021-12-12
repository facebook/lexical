/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  NodeKey,
  OutlineNode,
  Selection,
  TextNode,
  ElementNode,
  Point,
} from 'outline';

import {
  $createLineBreakNode,
  $isDecoratorNode,
  $isLeafNode,
  $isTextNode,
  $isElementNode,
  $createTextNode,
  $isRootNode,
} from 'outline';

const cssToStyles: Map<string, {[string]: string}> = new Map();

function $cloneWithProperties<T: OutlineNode>(node: T): T {
  const latest = node.getLatest();
  const constructor = latest.constructor;
  const clone = constructor.clone(latest);
  clone.__parent = latest.__parent;
  if ($isElementNode(latest) && $isElementNode(clone)) {
    clone.__children = Array.from(latest.__children);
    clone.__format = latest.__format;
    clone.__indent = latest.__indent;
    clone.__dir = latest.__dir;
  } else if ($isTextNode(latest) && $isTextNode(clone)) {
    clone.__format = latest.__format;
    clone.__style = latest.__style;
    clone.__mode = latest.__mode;
    clone.__detail = latest.__detail;
  } else if ($isDecoratorNode(latest) && $isDecoratorNode(clone)) {
    clone.__ref = latest.__ref;
  }
  // $FlowFixMe
  return clone;
}

function $getIndexFromPossibleClone(
  node: OutlineNode,
  parent: ElementNode,
  nodeMap: Map<NodeKey, OutlineNode>,
): number {
  const parentClone = nodeMap.get(parent.getKey());
  if ($isElementNode(parentClone)) {
    return parentClone.__children.indexOf(node.getKey());
  }
  return node.getIndexWithinParent();
}

function $getParentAvoidingExcludedElements(
  node: OutlineNode,
): ElementNode | null {
  let parent = node.getParent();
  while (parent !== null && parent.excludeFromCopy()) {
    parent = parent.getParent();
  }
  return parent;
}

function $copyLeafNodeBranchToRoot(
  leaf: OutlineNode,
  startingOffset: number,
  isLeftSide: boolean,
  range: Array<NodeKey>,
  nodeMap: Map<NodeKey, OutlineNode>,
): void {
  let node = leaf;
  let offset = startingOffset;
  while (node !== null) {
    const parent = $getParentAvoidingExcludedElements(node);
    if (parent === null) {
      break;
    }
    if (!$isElementNode(node) || !node.excludeFromCopy()) {
      const key = node.getKey();
      let clone = nodeMap.get(key);
      const needsClone = clone === undefined;
      if (needsClone) {
        clone = $cloneWithProperties<OutlineNode>(node);
        nodeMap.set(key, clone);
      }
      if ($isTextNode(clone) && !clone.isSegmented() && !clone.isToken()) {
        clone.__text = clone.__text.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? undefined : offset,
        );
      } else if ($isElementNode(clone)) {
        clone.__children = clone.__children.slice(
          isLeftSide ? offset : 0,
          isLeftSide ? undefined : offset + 1,
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

export function $cloneContents(selection: Selection): {
  range: Array<NodeKey>,
  nodeMap: Array<[NodeKey, OutlineNode]>,
} {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorOffset = anchor.getCharacterOffset();
  const focusOffset = focus.getCharacterOffset();
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  const anchorNodeParent = anchorNode.getParentOrThrow();
  // Handle a single text node extraction
  if (
    anchorNode === focusNode &&
    $isTextNode(anchorNode) &&
    (anchorNodeParent.canBeEmpty() || anchorNodeParent.getChildrenSize() > 1)
  ) {
    const clonedFirstNode = $cloneWithProperties<TextNode>(anchorNode);
    const isBefore = focusOffset > anchorOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    clonedFirstNode.__text = clonedFirstNode.__text.slice(
      startOffset,
      endOffset,
    );
    const key = clonedFirstNode.getKey();
    return {range: [key], nodeMap: [[key, clonedFirstNode]]};
  }
  const nodes = selection.getNodes();
  if (nodes.length === 0) {
    return {range: [], nodeMap: []};
  }
  // Check if we can use the parent of the nodes, if the
  // parent can't be empty, then it's important that we
  // also copy that element node along with its children.
  let nodesLength = nodes.length;
  const firstNode = nodes[0];
  const firstNodeParent = firstNode.getParent();
  if (firstNodeParent !== null && !firstNodeParent.canBeEmpty()) {
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
  const range = [];

  // Do first node to root
  $copyLeafNodeBranchToRoot(
    firstNode,
    isBefore ? anchorOffset : focusOffset,
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
      (!$isElementNode(node) || !node.excludeFromCopy())
    ) {
      const clone = $cloneWithProperties<OutlineNode>(node);
      if ($isRootNode(node.getParent())) {
        range.push(node.getKey());
      }
      nodeMap.set(key, clone);
    }
  }
  // Do last node to root
  $copyLeafNodeBranchToRoot(
    lastNode,
    isBefore ? focusOffset : anchorOffset,
    false,
    range,
    nodeMap,
  );
  return {range, nodeMap: Array.from(nodeMap.entries())};
}

export function getStyleObjectFromCSS(css: string): {[string]: string} | null {
  return cssToStyles.get(css) || null;
}

function getCSSFromStyleObject(styles: {[string]: string}): string {
  let css = '';
  for (const style in styles) {
    if (style) {
      css += `${style}: ${styles[style]};`;
    }
  }
  return css;
}

function $patchNodeStyle(node: TextNode, patch: {[string]: string}): void {
  const prevStyles = getStyleObjectFromCSS(node.getStyle());
  const newStyles = prevStyles ? {...prevStyles, ...patch} : patch;
  const newCSSText = getCSSFromStyleObject(newStyles);
  node.setStyle(newCSSText);
  cssToStyles.set(newCSSText, newStyles);
}

export function $patchStyleText(
  selection: Selection,
  patch: {[string]: string},
): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const lastIndex = selectedNodesLength - 1;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];

  if (selection.isCollapsed()) {
    return;
  }
  const anchor = selection.anchor;
  const focus = selection.focus;
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const focusOffset = focus.offset;
  let anchorOffset = anchor.offset;
  let startOffset;
  let endOffset;

  const isBefore = anchor.isBefore(focus);
  startOffset = isBefore ? anchorOffset : focusOffset;
  endOffset = isBefore ? focusOffset : anchorOffset;

  // This is the case where the user only selected the very end of the
  // first node so we don't want to include it in the formatting change.
  if (startOffset === firstNode.getTextContentSize()) {
    const nextSibling = firstNode.getNextSibling();

    if ($isTextNode(nextSibling)) {
      // we basically make the second node the firstNode, changing offsets accordingly
      anchorOffset = 0;
      startOffset = 0;
      firstNode = nextSibling;
    }
  }

  // This is the case where we only selected a single node
  if (firstNode.is(lastNode)) {
    if ($isTextNode(firstNode)) {
      startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }
      // The entire node is selected, so just format it
      if (startOffset === 0 && endOffset === firstNodeTextLength) {
        $patchNodeStyle(firstNode, patch);
        firstNode.select(startOffset, endOffset);
      } else {
        // The node is partially selected, so split it into two nodes
        // and style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        $patchNodeStyle(replacement, patch);
        replacement.select(0, endOffset - startOffset);
      }
    }
    // multiple nodes selected.
  } else {
    if ($isTextNode(firstNode)) {
      if (startOffset !== 0) {
        // the entire first node isn't selected, so split it
        [, firstNode] = firstNode.splitText(startOffset);
        startOffset = 0;
      }
      $patchNodeStyle(firstNode, patch);
    }

    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      // if the entire last node isn't selected, split it
      if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
      }
      if (endOffset !== 0) {
        $patchNodeStyle(lastNode, patch);
      }
    }

    // style all the text nodes in between
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      const selectedNodeKey = selectedNode.getKey();
      if (
        $isTextNode(selectedNode) &&
        selectedNodeKey !== firstNode.getKey() &&
        selectedNodeKey !== lastNode.getKey() &&
        !selectedNode.isToken()
      ) {
        $patchNodeStyle(selectedNode, patch);
      }
    }
  }
}

export function $getSelectionStyleValueForProperty(
  selection: Selection,
  styleProperty: string,
  defaultValue: string = '',
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

export function $moveCaretSelection(
  selection: Selection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

function isParentElementRTL(selection: Selection): boolean {
  const anchorNode = selection.anchor.getNode();
  const parent = anchorNode.getParentOrThrow();
  return parent.getDirection() === 'rtl';
}

export function $moveCharacter(
  selection: Selection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void {
  const isRTL = isParentElementRTL(selection);
  $moveCaretSelection(
    selection,
    isHoldingShift,
    isBackward ? !isRTL : isRTL,
    'character',
  );
}

export function $insertRichText(selection: Selection, text: string): void {
  const parts = text.split(/\r?\n/);
  if (parts.length === 1) {
    selection.insertText(text);
  } else {
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part !== '') {
        nodes.push($createTextNode(part));
      }
      if (i !== length - 1) {
        nodes.push($createLineBreakNode());
      }
    }
    selection.insertNodes(nodes);
  }
}

export function $selectAll(selection: Selection): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const topParent = anchorNode.getTopLevelElementOrThrow();
  const root = topParent.getParentOrThrow();
  let firstNode = root.getFirstDescendant();
  let lastNode = root.getLastDescendant();
  let firstType = 'element';
  let lastType = 'element';
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
    lastOffset = lastNode.getChildrenSize();
  }
  if (firstNode && lastNode) {
    anchor.set(firstNode.getKey(), 0, firstType);
    focus.set(lastNode.getKey(), lastOffset, lastType);
  }
}

function $removeParentEmptyElements(startingNode: ElementNode): void {
  let node = startingNode;
  while (node !== null && !$isRootNode(node)) {
    const latest = node.getLatest();
    const parentNode = node.getParent();
    if (latest.__children.length === 0) {
      node.remove();
    }
    node = parentNode;
  }
}

export function $wrapLeafNodesInElements(
  selection: Selection,
  createElement: () => ElementNode,
  wrappingElement?: ElementNode,
): void {
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;
  if (nodesLength === 0) {
    const anchor = selection.anchor;
    const target =
      anchor.type === 'text'
        ? anchor.getNode().getParentOrThrow()
        : anchor.getNode();
    const children = target.getChildren();
    let element = createElement();
    children.forEach((child) => element.append(child));
    if (wrappingElement) {
      element = wrappingElement.append(element);
    }
    target.replace(element);
    return;
  }
  const firstNode = nodes[0];
  const elementMapping: Map<NodeKey, ElementNode> = new Map();
  const elements = [];
  // The below logic is to find the right target for us to
  // either insertAfter/insertBefore/append the corresponding
  // elements to. This is made more complicated due to nested
  // structures.
  let target = $isElementNode(firstNode)
    ? firstNode
    : firstNode.getParentOrThrow();
  while (target !== null) {
    const prevSibling = target.getPreviousSibling();
    if (prevSibling !== null) {
      target = prevSibling;
      break;
    }
    target = target.getParentOrThrow();
    if ($isRootNode(target)) {
      break;
    }
  }
  const emptyElements = new Set();

  // Find any top level empty elements
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if ($isElementNode(node) && node.getChildrenSize() === 0) {
      emptyElements.add(node.getKey());
    }
  }

  const movedLeafNodes: Set<NodeKey> = new Set();

  // Move out all leaf nodes into our elements array.
  // If we find a top level empty element, also move make
  // an element for that.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    const parent = node.getParent();
    if (
      parent !== null &&
      $isLeafNode(node) &&
      !movedLeafNodes.has(node.getKey())
    ) {
      const parentKey = parent.getKey();
      if (elementMapping.get(parentKey) === undefined) {
        const targetElement = createElement();
        elements.push(targetElement);
        elementMapping.set(parentKey, targetElement);

        // Move node and its siblings to the new
        // element.
        parent.getChildren().forEach((child) => {
          targetElement.append(child);
          movedLeafNodes.add(child.getKey());
        });
        $removeParentEmptyElements(parent);
      }
    } else if (emptyElements.has(node.getKey())) {
      elements.push(createElement());
      node.remove();
    }
  }
  if (wrappingElement) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      wrappingElement.append(element);
    }
  }
  // If our target is the root, let's see if we can re-adjust
  // so that the target is the first child instead.
  if ($isRootNode(target)) {
    const firstChild = target.getFirstChild();
    if ($isElementNode(firstChild)) {
      target = firstChild;
    }

    if (firstChild === null) {
      if (wrappingElement) {
        target.append(wrappingElement);
      } else {
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          target.append(element);
        }
      }
    } else {
      if (wrappingElement) {
        firstChild.insertBefore(wrappingElement);
      } else {
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          firstChild.insertBefore(element);
        }
      }
    }
  } else {
    if (wrappingElement) {
      target.insertAfter(wrappingElement);
    } else {
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        target.insertAfter(element);
      }
    }
  }
  selection.dirty = true;
}

export function $isAtNodeEnd(point: Point): boolean {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }
  return point.offset === point.getNode().getChildrenSize();
}
