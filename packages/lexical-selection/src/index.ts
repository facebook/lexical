/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementNode,
  GridSelection,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  NodeSelection,
  Point,
  RangeSelection,
  TextNode,
} from 'lexical';

import {
  $getDecoratorNode,
  $getPreviousSelection,
  $isDecoratorNode,
  $isElementNode,
  $isGridSelection,
  $isLeafNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setSelection,
} from 'lexical';
import invariant from 'shared/invariant';

const cssToStyles: Map<string, Record<string, string>> = new Map();

export function $cloneWithProperties<T extends LexicalNode>(node: T): T {
  const latest = node.getLatest<T>();
  const constructor = latest.constructor;
  // @ts-expect-error
  const clone: T = constructor.clone(latest);
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
  }

  return clone;
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
  startingOffset: number,
  endingOffset: number,
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

function errGetLatestOnClone(): void {
  invariant(false, 'getLatest() on clone node');
}

export function $cloneContents(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
} {
  const clone = $cloneContentsImpl(selection);

  // @ts-ignore
  if (__DEV__) {
    const nodeMap = clone.nodeMap;

    for (let i = 0; i < nodeMap.length; i++) {
      const node = nodeMap[i][1];

      if (node.getLatest === errGetLatestOnClone) {
        continue;
      }

      Object.setPrototypeOf(
        node,
        Object.create(Object.getPrototypeOf(node), {
          getLatest: {
            configurable: true,
            enumerable: true,
            value: errGetLatestOnClone,
            writable: true,
          },
        }),
      );
    }
  }

  return clone;
}

function $cloneContentsImpl(
  selection: RangeSelection | NodeSelection | GridSelection,
): {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
} {
  if ($isRangeSelection(selection)) {
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
    const range = [];
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
  } else if ($isGridSelection(selection)) {
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

  invariant(false, 'TODO');
}

export function getStyleObjectFromCSS(
  css: string,
): Record<string, string> | null {
  return cssToStyles.get(css) || null;
}

function getCSSFromStyleObject(styles: Record<string, string>): string {
  let css = '';

  for (const style in styles) {
    if (style) {
      css += `${style}: ${styles[style]};`;
    }
  }

  return css;
}

function $patchNodeStyle(node: TextNode, patch: Record<string, string>): void {
  const prevStyles = getStyleObjectFromCSS(node.getStyle());
  const newStyles = prevStyles ? {...prevStyles, ...patch} : patch;
  const newCSSText = getCSSFromStyleObject(newStyles);
  node.setStyle(newCSSText);
  cssToStyles.set(newCSSText, newStyles);
}

export function $patchStyleText(
  selection: RangeSelection | GridSelection,
  patch: Record<string, string>,
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
    } // multiple nodes selected.
  } else {
    if ($isTextNode(firstNode)) {
      if (startOffset !== 0) {
        // the entire first node isn't selected, so split it
        firstNode = firstNode.splitText(startOffset)[1];
        startOffset = 0;
      }

      $patchNodeStyle(firstNode as TextNode, patch);
    }

    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;

      // if the entire last node isn't selected, split it
      if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
      }

      if (endOffset !== 0) {
        $patchNodeStyle(lastNode as TextNode, patch);
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

function $removeParentEmptyElements(startingNode: ElementNode): void {
  let node = startingNode;

  while (node !== null && !$isRootNode(node)) {
    const latest = node.getLatest<ElementNode>();
    const parentNode = node.getParent();

    if (latest.__children.length === 0) {
      node.remove(true);
    }

    node = parentNode;
  }
}

export function $wrapLeafNodesInElements(
  selection: RangeSelection,
  createElement: () => ElementNode,
  wrappingElement?: ElementNode,
): void {
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;
  const anchor = selection.anchor;

  if (
    nodesLength === 0 ||
    (nodesLength === 1 &&
      anchor.type === 'element' &&
      anchor.getNode().getChildrenSize() === 0)
  ) {
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

  if (target.isInline()) {
    target = target.getParentOrThrow();
  }

  while (target !== null) {
    const prevSibling = target.getPreviousSibling<ElementNode>();

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
    let parent = node.getParent();

    if (parent !== null && parent.isInline()) {
      parent = parent.getParent();
    }

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

  const prevSelection = $getPreviousSelection();

  if (
    $isRangeSelection(prevSelection) &&
    isPointAttached(prevSelection.anchor) &&
    isPointAttached(prevSelection.focus)
  ) {
    $setSelection(prevSelection.clone());
  } else {
    selection.dirty = true;
  }
}

function isPointAttached(point: Point): boolean {
  return point.getNode().isAttached();
}

export function $isAtNodeEnd(point: Point): boolean {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }

  return point.offset === point.getNode().getChildrenSize();
}

export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean {
  const possibleNode = $getDecoratorNode(selection.focus, isBackward);

  return $isDecoratorNode(possibleNode) && !possibleNode.isIsolated();
}

function getDOMTextNode(element: Node | null): Text | null {
  let node = element;

  while (node != null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node as Text;
    }

    node = node.firstChild;
  }

  return null;
}

function getDOMIndexWithinParent(node: ChildNode): [ParentNode, number] {
  const parent = node.parentNode;

  if (parent == null) {
    throw new Error('Should never happen');
  }

  return [parent, Array.from(parent.childNodes).indexOf(node)];
}

export function createDOMRange(
  editor: LexicalEditor,
  anchorNode: LexicalNode,
  _anchorOffset: number,
  focusNode: LexicalNode,
  _focusOffset: number,
): Range | null {
  const anchorKey = anchorNode.getKey();
  const focusKey = focusNode.getKey();
  const range = document.createRange();
  let anchorDOM = editor.getElementByKey(anchorKey) as Node;
  let focusDOM = editor.getElementByKey(focusKey) as Node;
  let anchorOffset = _anchorOffset;
  let focusOffset = _focusOffset;

  if ($isTextNode(anchorNode)) {
    anchorDOM = getDOMTextNode(anchorDOM);
  }

  if ($isTextNode(focusNode)) {
    focusDOM = getDOMTextNode(focusDOM);
  }

  if (
    anchorNode === undefined ||
    focusNode === undefined ||
    anchorDOM === null ||
    focusDOM === null
  ) {
    return null;
  }

  if (anchorDOM.nodeName === 'BR') {
    [anchorDOM, anchorOffset] = getDOMIndexWithinParent(anchorDOM as ChildNode);
  }

  if (focusDOM.nodeName === 'BR') {
    [focusDOM, focusOffset] = getDOMIndexWithinParent(focusDOM as ChildNode);
  }

  const firstChild = anchorDOM.firstChild;

  if (
    anchorDOM === focusDOM &&
    firstChild != null &&
    firstChild.nodeName === 'BR' &&
    anchorOffset === 0 &&
    focusOffset === 0
  ) {
    focusOffset = 1;
  }

  try {
    range.setStart(anchorDOM, anchorOffset);
    range.setEnd(focusDOM, focusOffset);
  } catch (e) {
    return null;
  }

  if (
    range.collapsed &&
    (anchorOffset !== focusOffset || anchorKey !== focusKey)
  ) {
    // Range is backwards, we need to reverse it
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }

  return range;
}

export function createRectsFromDOMRange(
  editor: LexicalEditor,
  range: Range,
): Array<ClientRect> {
  const rootElement = editor.getRootElement();

  if (rootElement === null) {
    return [];
  }
  const rootRect = rootElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(rootElement);
  const rootPadding =
    parseFloat(computedStyle.paddingLeft) +
    parseFloat(computedStyle.paddingRight);
  const selectionRects = Array.from(range.getClientRects());
  let selectionRectsLength = selectionRects.length;
  let prevRect;

  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    // Exclude a rect that is the exact same as the last rect. getClientRects() can return
    // the same rect twice for some elements. A more sophisticated thing to do here is to
    // merge all the rects together into a set of rects that don't overlap, so we don't
    // generate backgrounds that are too dark.
    const isDuplicateRect =
      prevRect &&
      prevRect.top === selectionRect.top &&
      prevRect.left === selectionRect.left &&
      prevRect.width === selectionRect.width &&
      prevRect.height === selectionRect.height;

    // Exclude selections that span the entire element
    const selectionSpansElement =
      selectionRect.width + rootPadding === rootRect.width;

    if (isDuplicateRect || selectionSpansElement) {
      selectionRects.splice(i--, 1);
      selectionRectsLength--;
      continue;
    }
    prevRect = selectionRect;
  }
  return selectionRects;
}
