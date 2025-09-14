/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  BaseSelection,
  ElementNode,
  LexicalNode,
  NodeKey,
  Point,
  RangeSelection,
  TextNode,
} from 'lexical';

import {TableSelection} from '@lexical/table';
import {
  $caretFromPoint,
  $createRangeSelection,
  $extendCaretToRange,
  $findMatchingParent,
  $getPreviousSelection,
  $getSelection,
  $hasAncestor,
  $isChildCaret,
  $isDecoratorNode,
  $isElementNode,
  $isExtendableTextPointCaret,
  $isLeafNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $setSelection,
  INTERNAL_$isBlock,
} from 'lexical';
import invariant from 'shared/invariant';

import {
  $getComputedStyleForElement,
  $getComputedStyleForParent,
  getStyleObjectFromCSS,
} from './utils';

export function $copyBlockFormatIndent(
  srcNode: ElementNode,
  destNode: ElementNode,
): void {
  const format = srcNode.getFormatType();
  const indent = srcNode.getIndent();
  if (format !== destNode.getFormatType()) {
    destNode.setFormat(format);
  }
  if (indent !== destNode.getIndent()) {
    destNode.setIndent(indent);
  }
}

/**
 * Converts all nodes in the selection that are of one block type to another.
 * @param selection - The selected blocks to be converted.
 * @param $createElement - The function that creates the node. eg. $createParagraphNode.
 * @param $afterCreateElement - The function that updates the new node based on the previous one ($copyBlockFormatIndent by default)
 */
export function $setBlocksType<T extends ElementNode>(
  selection: BaseSelection | null,
  $createElement: () => T,
  $afterCreateElement: (
    prevNodeSrc: ElementNode,
    newNodeDest: T,
  ) => void = $copyBlockFormatIndent,
): void {
  if (selection === null) {
    return;
  }
  // Selections tend to not include their containing blocks so we effectively
  // expand it here
  const anchorAndFocus = selection.getStartEndPoints();
  const blockMap = new Map<NodeKey, ElementNode>();
  let newSelection: RangeSelection | null = null;
  if (anchorAndFocus) {
    const [anchor, focus] = anchorAndFocus;
    newSelection = $createRangeSelection();
    newSelection.anchor.set(anchor.key, anchor.offset, anchor.type);
    newSelection.focus.set(focus.key, focus.offset, focus.type);
    const anchorBlock = $findMatchingParent(
      anchor.getNode(),
      INTERNAL_$isBlock,
    );
    const focusBlock = $findMatchingParent(focus.getNode(), INTERNAL_$isBlock);
    if ($isElementNode(anchorBlock)) {
      blockMap.set(anchorBlock.getKey(), anchorBlock);
    }
    if ($isElementNode(focusBlock)) {
      blockMap.set(focusBlock.getKey(), focusBlock);
    }
  }
  for (const node of selection.getNodes()) {
    if ($isElementNode(node) && INTERNAL_$isBlock(node)) {
      blockMap.set(node.getKey(), node);
    } else if (anchorAndFocus === null) {
      const ancestorBlock = $findMatchingParent(node, INTERNAL_$isBlock);
      if ($isElementNode(ancestorBlock)) {
        blockMap.set(ancestorBlock.getKey(), ancestorBlock);
      }
    }
  }
  for (const [key, prevNode] of blockMap) {
    const element = $createElement();
    $afterCreateElement(prevNode, element);
    prevNode.replace(element, true);
    if (newSelection) {
      if (key === newSelection.anchor.key) {
        newSelection.anchor.set(
          element.getKey(),
          newSelection.anchor.offset,
          newSelection.anchor.type,
        );
      }
      if (key === newSelection.focus.key) {
        newSelection.focus.set(
          element.getKey(),
          newSelection.focus.offset,
          newSelection.focus.type,
        );
      }
    }
  }
  if (newSelection && selection.is($getSelection())) {
    $setSelection(newSelection);
  }
}

function isPointAttached(point: Point): boolean {
  return point.getNode().isAttached();
}

function $removeParentEmptyElements(startingNode: ElementNode): void {
  let node: ElementNode | null = startingNode;

  while (node !== null && !$isRootOrShadowRoot(node)) {
    const latest = node.getLatest();
    const parentNode: ElementNode | null = node.getParent<ElementNode>();

    if (latest.getChildrenSize() === 0) {
      node.remove(true);
    }

    node = parentNode;
  }
}

/**
 * @deprecated In favor of $setBlockTypes
 * Wraps all nodes in the selection into another node of the type returned by createElement.
 * @param selection - The selection of nodes to be wrapped.
 * @param createElement - A function that creates the wrapping ElementNode. eg. $createParagraphNode.
 * @param wrappingElement - An element to append the wrapped selection and its children to.
 */
export function $wrapNodes(
  selection: BaseSelection,
  createElement: () => ElementNode,
  wrappingElement: null | ElementNode = null,
): void {
  const anchorAndFocus = selection.getStartEndPoints();
  const anchor = anchorAndFocus ? anchorAndFocus[0] : null;
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;

  if (
    anchor !== null &&
    (nodesLength === 0 ||
      (nodesLength === 1 &&
        anchor.type === 'element' &&
        anchor.getNode().getChildrenSize() === 0))
  ) {
    const target =
      anchor.type === 'text'
        ? anchor.getNode().getParentOrThrow()
        : anchor.getNode();
    const children = target.getChildren();
    let element = createElement();
    element.setFormat(target.getFormatType());
    element.setIndent(target.getIndent());
    children.forEach((child) => element.append(child));

    if (wrappingElement) {
      element = wrappingElement.append(element);
    }

    target.replace(element);

    return;
  }

  let topLevelNode = null;
  let descendants: LexicalNode[] = [];
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    // Determine whether wrapping has to be broken down into multiple chunks. This can happen if the
    // user selected multiple Root-like nodes that have to be treated separately as if they are
    // their own branch. I.e. you don't want to wrap a whole table, but rather the contents of each
    // of each of the cell nodes.
    if ($isRootOrShadowRoot(node)) {
      $wrapNodesImpl(
        selection,
        descendants,
        descendants.length,
        createElement,
        wrappingElement,
      );
      descendants = [];
      topLevelNode = node;
    } else if (
      topLevelNode === null ||
      (topLevelNode !== null && $hasAncestor(node, topLevelNode))
    ) {
      descendants.push(node);
    } else {
      $wrapNodesImpl(
        selection,
        descendants,
        descendants.length,
        createElement,
        wrappingElement,
      );
      descendants = [node];
    }
  }
  $wrapNodesImpl(
    selection,
    descendants,
    descendants.length,
    createElement,
    wrappingElement,
  );
}

/**
 * Wraps each node into a new ElementNode.
 * @param selection - The selection of nodes to wrap.
 * @param nodes - An array of nodes, generally the descendants of the selection.
 * @param nodesLength - The length of nodes.
 * @param createElement - A function that creates the wrapping ElementNode. eg. $createParagraphNode.
 * @param wrappingElement - An element to wrap all the nodes into.
 * @returns
 */
export function $wrapNodesImpl(
  selection: BaseSelection,
  nodes: LexicalNode[],
  nodesLength: number,
  createElement: () => ElementNode,
  wrappingElement: null | ElementNode = null,
): void {
  if (nodes.length === 0) {
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

  let targetIsPrevSibling = false;
  while (target !== null) {
    const prevSibling = target.getPreviousSibling<ElementNode>();

    if (prevSibling !== null) {
      target = prevSibling;
      targetIsPrevSibling = true;
      break;
    }

    target = target.getParentOrThrow();

    if ($isRootOrShadowRoot(target)) {
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

  const movedNodes: Set<NodeKey> = new Set();

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
      !movedNodes.has(node.getKey())
    ) {
      const parentKey = parent.getKey();

      if (elementMapping.get(parentKey) === undefined) {
        const targetElement = createElement();
        targetElement.setFormat(parent.getFormatType());
        targetElement.setIndent(parent.getIndent());
        elements.push(targetElement);
        elementMapping.set(parentKey, targetElement);
        // Move node and its siblings to the new
        // element.
        parent.getChildren().forEach((child) => {
          targetElement.append(child);
          movedNodes.add(child.getKey());
          if ($isElementNode(child)) {
            // Skip nested leaf nodes if the parent has already been moved
            child.getChildrenKeys().forEach((key) => movedNodes.add(key));
          }
        });
        $removeParentEmptyElements(parent);
      }
    } else if (emptyElements.has(node.getKey())) {
      invariant(
        $isElementNode(node),
        'Expected node in emptyElements to be an ElementNode',
      );
      const targetElement = createElement();
      targetElement.setFormat(node.getFormatType());
      targetElement.setIndent(node.getIndent());
      elements.push(targetElement);
      node.remove(true);
    }
  }

  if (wrappingElement !== null) {
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      wrappingElement.append(element);
    }
  }
  let lastElement = null;

  // If our target is Root-like, let's see if we can re-adjust
  // so that the target is the first child instead.
  if ($isRootOrShadowRoot(target)) {
    if (targetIsPrevSibling) {
      if (wrappingElement !== null) {
        target.insertAfter(wrappingElement);
      } else {
        for (let i = elements.length - 1; i >= 0; i--) {
          const element = elements[i];
          target.insertAfter(element);
        }
      }
    } else {
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
            lastElement = element;
          }
        }
      } else {
        if (wrappingElement !== null) {
          firstChild.insertBefore(wrappingElement);
        } else {
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            firstChild.insertBefore(element);
            lastElement = element;
          }
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
        lastElement = element;
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
  } else if (lastElement !== null) {
    lastElement.selectEnd();
  } else {
    selection.dirty = true;
  }
}

/**
 * Tests if the selection's parent element has vertical writing mode.
 * @param selection - The selection whose parent to test.
 * @returns true if the selection's parent has vertical writing mode (writing-mode: vertical-rl), false otherwise.
 */
function $isEditorVerticalOrientation(selection: RangeSelection): boolean {
  const computedStyle = $getComputedStyle(selection);
  return computedStyle !== null && computedStyle.writingMode === 'vertical-rl';
}

/**
 * Gets the computed DOM styles of the parent of the selection's anchor node.
 * @param selection - The selection to check the styles for.
 * @returns the computed styles of the node or null if there is no DOM element or no default view for the document.
 */
function $getComputedStyle(
  selection: RangeSelection,
): CSSStyleDeclaration | null {
  const anchorNode = selection.anchor.getNode();
  if ($isElementNode(anchorNode)) {
    return $getComputedStyleForElement(anchorNode);
  }
  return $getComputedStyleForParent(anchorNode);
}

/**
 * Determines if the default character selection should be overridden. Used with DecoratorNodes
 * @param selection - The selection whose default character selection may need to be overridden.
 * @param isBackward - Is the selection backwards (the focus comes before the anchor)?
 * @returns true if it should be overridden, false if not.
 */
export function $shouldOverrideDefaultCharacterSelection(
  selection: RangeSelection,
  isBackward: boolean,
): boolean {
  const isVertical = $isEditorVerticalOrientation(selection);

  // In vertical writing mode, we adjust the direction for correct caret movement
  let adjustedIsBackward = isVertical ? !isBackward : isBackward;

  // In right-to-left writing mode, we invert the direction for correct caret movement
  if ($isParentElementRTL(selection)) {
    adjustedIsBackward = !adjustedIsBackward;
  }

  const focusCaret = $caretFromPoint(
    selection.focus,
    adjustedIsBackward ? 'previous' : 'next',
  );
  if ($isExtendableTextPointCaret(focusCaret)) {
    return false;
  }
  for (const nextCaret of $extendCaretToRange(focusCaret)) {
    if ($isChildCaret(nextCaret)) {
      return !nextCaret.origin.isInline();
    } else if ($isElementNode(nextCaret.origin)) {
      continue;
    } else if ($isDecoratorNode(nextCaret.origin)) {
      return true;
    }
    break;
  }
  return false;
}

/**
 * Moves the selection according to the arguments.
 * @param selection - The selected text or nodes.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection selected backwards (the focus comes before the anchor)?
 * @param granularity - The distance to adjust the current selection.
 */
export function $moveCaretSelection(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

/**
 * Tests a parent element for right to left direction.
 * @param selection - The selection whose parent is to be tested.
 * @returns true if the selections' parent element has a direction of 'rtl' (right to left), false otherwise.
 */
export function $isParentElementRTL(selection: RangeSelection): boolean {
  const computedStyle = $getComputedStyle(selection);
  return computedStyle !== null && computedStyle.direction === 'rtl';
}

/**
 * Moves selection by character according to arguments.
 * @param selection - The selection of the characters to move.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection backward (the focus comes before the anchor)?
 */
export function $moveCharacter(
  selection: RangeSelection,
  isHoldingShift: boolean,
  isBackward: boolean,
): void {
  const isRTL = $isParentElementRTL(selection);
  const isVertical = $isEditorVerticalOrientation(selection);

  // In vertical-rl writing mode, arrow key directions need to be flipped
  // to match the visual flow of text (top to bottom, right to left)
  let adjustedIsBackward;

  if (isVertical) {
    // In vertical-rl mode, we need to completely invert the direction
    // Left arrow (backward) should move down (forward)
    // Right arrow (forward) should move up (backward)
    adjustedIsBackward = !isBackward;
  } else if (isRTL) {
    // In horizontal RTL mode, use the standard RTL behavior
    adjustedIsBackward = !isBackward;
  } else {
    // Standard LTR horizontal text
    adjustedIsBackward = isBackward;
  }

  // Apply the direction adjustment to move the caret
  $moveCaretSelection(
    selection,
    isHoldingShift,
    adjustedIsBackward,
    'character',
  );
}

/**
 * Returns the current value of a CSS property for Nodes, if set. If not set, it returns the defaultValue.
 * @param node - The node whose style value to get.
 * @param styleProperty - The CSS style property.
 * @param defaultValue - The default value for the property.
 * @returns The value of the property for node.
 */
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

/**
 * Returns the current value of a CSS property for TextNodes in the Selection, if set. If not set, it returns the defaultValue.
 * If all TextNodes do not have the same value, it returns an empty string.
 * @param selection - The selection of TextNodes whose value to find.
 * @param styleProperty - The CSS style property.
 * @param defaultValue - The default value for the property, defaults to an empty string.
 * @returns The value of the property for the selected TextNodes.
 */
export function $getSelectionStyleValueForProperty(
  selection: RangeSelection | TableSelection,
  styleProperty: string,
  defaultValue = '',
): string {
  let styleValue: string | null = null;
  const nodes = selection.getNodes();
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBackward = selection.isBackward();
  const endOffset = isBackward ? focus.offset : anchor.offset;
  const endNode = isBackward ? focus.getNode() : anchor.getNode();

  if (
    $isRangeSelection(selection) &&
    selection.isCollapsed() &&
    selection.style !== ''
  ) {
    const css = selection.style;
    const styleObject = getStyleObjectFromCSS(css);

    if (styleObject !== null && styleProperty in styleObject) {
      return styleObject[styleProperty];
    }
  }

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
        // have the same style.
        styleValue = '';
        break;
      }
    }
  }

  return styleValue === null ? defaultValue : styleValue;
}
