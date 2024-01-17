/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getPreviousSelection,
  $INTERNAL_isPointSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $normalizeSelection__EXPERIMENTAL,
  $setSelection,
  BaseSelection,
  DEPRECATED_$isGridCellNode,
  ElementNode,
  INTERNAL_PointSelection,
  LexicalEditor,
  LexicalNode,
  Point,
  RangeSelection,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {CSS_TO_STYLES} from './constants';
import {
  getCSSFromStyleObject,
  getStyleObjectFromCSS,
  getStyleObjectFromRawCSS,
} from './utils';

function $updateElementNodeProperties<T extends ElementNode>(
  target: T,
  source: ElementNode,
): T {
  target.__first = source.__first;
  target.__last = source.__last;
  target.__size = source.__size;
  target.__format = source.__format;
  target.__indent = source.__indent;
  target.__dir = source.__dir;
  return target;
}

function $updateTextNodeProperties<T extends TextNode>(
  target: T,
  source: TextNode,
): T {
  target.__format = source.__format;
  target.__style = source.__style;
  target.__mode = source.__mode;
  target.__detail = source.__detail;
  return target;
}

/**
 * Returns a copy of a node, but generates a new key for the copy.
 * @param node - The node to be cloned.
 * @returns The clone of the node.
 */
export function $cloneWithProperties<T extends LexicalNode>(node: T): T {
  const constructor = node.constructor;
  // @ts-expect-error
  const clone: T = constructor.clone(node);
  clone.__parent = node.__parent;
  clone.__next = node.__next;
  clone.__prev = node.__prev;

  if ($isElementNode(node) && $isElementNode(clone)) {
    return $updateElementNodeProperties(clone, node);
  }

  if ($isTextNode(node) && $isTextNode(clone)) {
    return $updateTextNodeProperties(clone, node);
  }

  return clone;
}

/**
 * Generally used to append text content to HTML and JSON. Grabs the text content and "slices"
 * it to be generated into the new TextNode.
 * @param selection - The selection containing the node whose TextNode is to be edited.
 * @param textNode - The TextNode to be edited.
 * @returns The updated TextNode.
 */
export function $sliceSelectedTextNodeContent(
  selection: BaseSelection,
  textNode: TextNode,
): LexicalNode {
  if (
    textNode.isSelected(selection) &&
    !textNode.isSegmented() &&
    !textNode.isToken() &&
    $INTERNAL_isPointSelection(selection)
  ) {
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    const isAnchor = textNode.is(anchorNode);
    const isFocus = textNode.is(focusNode);

    if (isAnchor || isFocus) {
      const isBackward = selection.isBackward();
      const [anchorOffset, focusOffset] = selection.getCharacterOffsets();
      const isSame = anchorNode.is(focusNode);
      const isFirst = textNode.is(isBackward ? focusNode : anchorNode);
      const isLast = textNode.is(isBackward ? anchorNode : focusNode);
      let startOffset = 0;
      let endOffset = undefined;

      if (isSame) {
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;
      } else if (isFirst) {
        const offset = isBackward ? focusOffset : anchorOffset;
        startOffset = offset;
        endOffset = undefined;
      } else if (isLast) {
        const offset = isBackward ? anchorOffset : focusOffset;
        startOffset = 0;
        endOffset = offset;
      }

      textNode.__text = textNode.__text.slice(startOffset, endOffset);
      return textNode;
    }
  }
  return textNode;
}

/**
 * Determines if the current selection is at the end of the node.
 * @param point - The point of the selection to test.
 * @returns true if the provided point offset is in the last possible position, false otherwise.
 */
export function $isAtNodeEnd(point: Point): boolean {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }
  const node = point.getNode();
  invariant(
    $isElementNode(node),
    'isAtNodeEnd: node must be a TextNode or ElementNode',
  );

  return point.offset === node.getChildrenSize();
}

/**
 * Trims text from a node in order to shorten it, eg. to enforce a text's max length. If it deletes text
 * that is an ancestor of the anchor then it will leave 2 indents, otherwise, if no text content exists, it deletes
 * the TextNode. It will move the focus to either the end of any left over text or beginning of a new TextNode.
 * @param editor - The lexical editor.
 * @param anchor - The anchor of the current selection, where the selection should be pointing.
 * @param delCount - The amount of characters to delete. Useful as a dynamic variable eg. textContentSize - maxLength;
 */
export function trimTextContentFromAnchor(
  editor: LexicalEditor,
  anchor: Point,
  delCount: number,
): void {
  // Work from the current selection anchor point
  let currentNode: LexicalNode | null = anchor.getNode();
  let remaining: number = delCount;

  if ($isElementNode(currentNode)) {
    const descendantNode = currentNode.getDescendantByIndex(anchor.offset);
    if (descendantNode !== null) {
      currentNode = descendantNode;
    }
  }

  while (remaining > 0 && currentNode !== null) {
    if ($isElementNode(currentNode)) {
      const lastDescendant: null | LexicalNode =
        currentNode.getLastDescendant<LexicalNode>();
      if (lastDescendant !== null) {
        currentNode = lastDescendant;
      }
    }
    let nextNode: LexicalNode | null = currentNode.getPreviousSibling();
    let additionalElementWhitespace = 0;
    if (nextNode === null) {
      let parent: LexicalNode | null = currentNode.getParentOrThrow();
      let parentSibling: LexicalNode | null = parent.getPreviousSibling();

      while (parentSibling === null) {
        parent = parent.getParent();
        if (parent === null) {
          nextNode = null;
          break;
        }
        parentSibling = parent.getPreviousSibling();
      }
      if (parent !== null) {
        additionalElementWhitespace = parent.isInline() ? 0 : 2;
        nextNode = parentSibling;
      }
    }
    let text = currentNode.getTextContent();
    // If the text is empty, we need to consider adding in two line breaks to match
    // the content if we were to get it from its parent.
    if (text === '' && $isElementNode(currentNode) && !currentNode.isInline()) {
      // TODO: should this be handled in core?
      text = '\n\n';
    }
    const currentNodeSize = text.length;

    if (!$isTextNode(currentNode) || remaining >= currentNodeSize) {
      const parent = currentNode.getParent();
      currentNode.remove();
      if (
        parent != null &&
        parent.getChildrenSize() === 0 &&
        !$isRootNode(parent)
      ) {
        parent.remove();
      }
      remaining -= currentNodeSize + additionalElementWhitespace;
      currentNode = nextNode;
    } else {
      const key = currentNode.getKey();
      // See if we can just revert it to what was in the last editor state
      const prevTextContent: string | null = editor
        .getEditorState()
        .read(() => {
          const prevNode = $getNodeByKey(key);
          if ($isTextNode(prevNode) && prevNode.isSimpleText()) {
            return prevNode.getTextContent();
          }
          return null;
        });
      const offset = currentNodeSize - remaining;
      const slicedText = text.slice(0, offset);
      if (prevTextContent !== null && prevTextContent !== text) {
        const prevSelection = $getPreviousSelection();
        let target = currentNode;
        if (!currentNode.isSimpleText()) {
          const textNode = $createTextNode(prevTextContent);
          currentNode.replace(textNode);
          target = textNode;
        } else {
          currentNode.setTextContent(prevTextContent);
        }
        if ($isRangeSelection(prevSelection) && prevSelection.isCollapsed()) {
          const prevOffset = prevSelection.anchor.offset;
          target.select(prevOffset, prevOffset);
        }
      } else if (currentNode.isSimpleText()) {
        // Split text
        const isSelected = anchor.key === key;
        let anchorOffset = anchor.offset;
        // Move offset to end if it's less than the remaining number, otherwise
        // we'll have a negative splitStart.
        if (anchorOffset < remaining) {
          anchorOffset = currentNodeSize;
        }
        const splitStart = isSelected ? anchorOffset - remaining : 0;
        const splitEnd = isSelected ? anchorOffset : offset;
        if (isSelected && splitStart === 0) {
          const [excessNode] = currentNode.splitText(splitStart, splitEnd);
          excessNode.remove();
        } else {
          const [, excessNode] = currentNode.splitText(splitStart, splitEnd);
          excessNode.remove();
        }
      } else {
        const textNode = $createTextNode(slicedText);
        currentNode.replace(textNode);
      }
      remaining = 0;
    }
  }
}

/**
 * Gets the TextNode's style object and adds the styles to the CSS.
 * @param node - The TextNode to add styles to.
 */
export function $addNodeStyle(node: TextNode): void {
  const CSSText = node.getStyle();
  const styles = getStyleObjectFromRawCSS(CSSText);
  CSS_TO_STYLES.set(CSSText, styles);
}

function $patchStyle(
  target: TextNode | RangeSelection,
  patch: Record<
    string,
    string | null | ((currentStyleValue: string | null) => string)
  >,
): void {
  const prevStyles = getStyleObjectFromCSS(
    'getStyle' in target ? target.getStyle() : target.style,
  );
  const newStyles = Object.entries(patch).reduce<Record<string, string>>(
    (styles, [key, value]) => {
      if (value instanceof Function) {
        styles[key] = value(prevStyles[key]);
      } else if (value === null) {
        delete styles[key];
      } else {
        styles[key] = value;
      }
      return styles;
    },
    {...prevStyles} || {},
  );
  const newCSSText = getCSSFromStyleObject(newStyles);
  target.setStyle(newCSSText);
  CSS_TO_STYLES.set(newCSSText, newStyles);
}

/**
 * Applies the provided styles to the TextNodes in the provided Selection.
 * Will update partially selected TextNodes by splitting the TextNode and applying
 * the styles to the appropriate one.
 * @param selection - The selected node(s) to update.
 * @param patch - The patch to apply, which can include multiple styles. { CSSProperty: value }. Can also accept a function that returns the new property value.
 */
export function $patchStyleText(
  selection: INTERNAL_PointSelection,
  patch: Record<
    string,
    string | null | ((currentStyleValue: string | null) => string)
  >,
): void {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;

  if (!$isRangeSelection(selection)) {
    const cellSelection = $createRangeSelection();
    const cellSelectionAnchor = cellSelection.anchor;
    const cellSelectionFocus = cellSelection.focus;
    for (let i = 0; i < selectedNodesLength; i++) {
      const node = selectedNodes[i];
      if (DEPRECATED_$isGridCellNode(node)) {
        cellSelectionAnchor.set(node.getKey(), 0, 'element');
        cellSelectionFocus.set(
          node.getKey(),
          node.getChildrenSize(),
          'element',
        );
        $patchStyleText(
          $normalizeSelection__EXPERIMENTAL(cellSelection),
          patch,
        );
      }
    }
    $setSelection(selection);
    return;
  }

  const lastIndex = selectedNodesLength - 1;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];

  if (selection.isCollapsed() && $isRangeSelection(selection)) {
    $patchStyle(selection, patch);
    return;
  }

  const anchor = selection.anchor;
  const focus = selection.focus;
  const firstNodeText = firstNode.getTextContent();
  const firstNodeTextLength = firstNodeText.length;
  const focusOffset = focus.offset;
  let anchorOffset = anchor.offset;
  const isBefore = anchor.isBefore(focus);
  let startOffset = isBefore ? anchorOffset : focusOffset;
  let endOffset = isBefore ? focusOffset : anchorOffset;
  const startType = isBefore ? anchor.type : focus.type;
  const endType = isBefore ? focus.type : anchor.type;
  const endKey = isBefore ? focus.key : anchor.key;

  // This is the case where the user only selected the very end of the
  // first node so we don't want to include it in the formatting change.
  if ($isTextNode(firstNode) && startOffset === firstNodeTextLength) {
    const nextSibling = firstNode.getNextSibling();

    if ($isTextNode(nextSibling)) {
      // we basically make the second node the firstNode, changing offsets accordingly
      anchorOffset = 0;
      startOffset = 0;
      firstNode = nextSibling;
    }
  }

  // This is the case where we only selected a single node
  if (selectedNodes.length === 1) {
    if ($isTextNode(firstNode) && firstNode.canHaveFormat()) {
      startOffset =
        startType === 'element'
          ? 0
          : anchorOffset > focusOffset
          ? focusOffset
          : anchorOffset;
      endOffset =
        endType === 'element'
          ? firstNodeTextLength
          : anchorOffset > focusOffset
          ? anchorOffset
          : focusOffset;

      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }

      // The entire node is selected, so just format it
      if (startOffset === 0 && endOffset === firstNodeTextLength) {
        $patchStyle(firstNode, patch);
        firstNode.select(startOffset, endOffset);
      } else {
        // The node is partially selected, so split it into two nodes
        // and style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        $patchStyle(replacement, patch);
        replacement.select(0, endOffset - startOffset);
      }
    } // multiple nodes selected.
  } else {
    if (
      $isTextNode(firstNode) &&
      startOffset < firstNode.getTextContentSize() &&
      firstNode.canHaveFormat()
    ) {
      if (startOffset !== 0) {
        // the entire first node isn't selected, so split it
        firstNode = firstNode.splitText(startOffset)[1];
        startOffset = 0;
        anchor.set(firstNode.getKey(), startOffset, 'text');
      }

      $patchStyle(firstNode as TextNode, patch);
    }

    if ($isTextNode(lastNode) && lastNode.canHaveFormat()) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;

      // The last node might not actually be the end node
      //
      // If not, assume the last node is fully-selected unless the end offset is
      // zero.
      if (lastNode.__key !== endKey && endOffset !== 0) {
        endOffset = lastNodeTextLength;
      }

      // if the entire last node isn't selected, split it
      if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
      }

      if (endOffset !== 0) {
        $patchStyle(lastNode as TextNode, patch);
      }
    }

    // style all the text nodes in between
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      const selectedNodeKey = selectedNode.getKey();

      if (
        $isTextNode(selectedNode) &&
        selectedNode.canHaveFormat() &&
        selectedNodeKey !== firstNode.getKey() &&
        selectedNodeKey !== lastNode.getKey() &&
        !selectedNode.isToken()
      ) {
        $patchStyle(selectedNode, patch);
      }
    }
  }
}
