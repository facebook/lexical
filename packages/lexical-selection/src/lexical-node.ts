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
  $createTextNode,
  $getNodeByKey,
  $getPreviousSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  DEPRECATED_$isGridSelection,
} from 'lexical';

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

export function $cloneWithProperties<T extends LexicalNode>(node: T): T {
  const latest = node.getLatest();
  const constructor = latest.constructor;
  // @ts-expect-error
  const clone: T = constructor.clone(latest);
  clone.__parent = latest.__parent;
  clone.__next = latest.__next;
  clone.__prev = latest.__prev;

  if ($isElementNode(latest) && $isElementNode(clone)) {
    return $updateElementNodeProperties(clone, latest);
  }

  if ($isTextNode(latest) && $isTextNode(clone)) {
    return $updateTextNodeProperties(clone, latest);
  }

  return clone;
}

export function $sliceSelectedTextNodeContent(
  selection: RangeSelection | GridSelection | NodeSelection,
  textNode: TextNode,
): LexicalNode {
  if (
    textNode.isSelected() &&
    !textNode.isSegmented() &&
    !textNode.isToken() &&
    ($isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection))
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

export function $isAtNodeEnd(point: Point): boolean {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }

  return point.offset === point.getNode().getChildrenSize();
}

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
        if ($isElementNode(parentSibling)) {
          nextNode = parentSibling.getLastDescendant();
        } else {
          nextNode = parentSibling;
        }
      }
    }
    let text = currentNode.getTextContent();
    // If the text is empty, we need to consider adding in two line breaks to match
    // the content if we were to get it from its parent.
    if (text === '' && $isElementNode(currentNode) && !currentNode.isInline()) {
      // TODO: should this be handled in core?
      text = '\n\n';
    }
    const textNodeSize = text.length;
    const offset = textNodeSize - remaining;
    const slicedText = text.slice(0, offset);

    if (!$isTextNode(currentNode) || remaining >= textNodeSize) {
      const parent = currentNode.getParent();
      currentNode.remove();
      if (parent != null && parent.getChildrenSize() === 0) {
        parent.remove();
      }
      remaining -= textNodeSize + additionalElementWhitespace;
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
        // Move offset to end if it's less than the remaniing number, otherwise
        // we'll have a negative splitStart.
        if (anchorOffset < remaining) {
          anchorOffset = textNodeSize;
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

export interface ICloneSelectionContent {
  nodeMap: Array<[NodeKey, LexicalNode]>;
  range: Array<NodeKey>;
}

export function $addNodeStyle(node: TextNode): void {
  const CSSText = node.getStyle();
  const styles = getStyleObjectFromRawCSS(CSSText);
  CSS_TO_STYLES.set(CSSText, styles);
}

function $patchNodeStyle(
  node: TextNode,
  patch: Record<string, string | null>,
): void {
  const prevStyles = getStyleObjectFromCSS(node.getStyle());
  const newStyles = Object.entries(patch).reduce<Record<string, string>>(
    (styles, [key, value]) => {
      if (value === null) {
        delete styles[key];
      } else {
        styles[key] = value;
      }
      return styles;
    },
    {...prevStyles} || {},
  );
  const newCSSText = getCSSFromStyleObject(newStyles);
  node.setStyle(newCSSText);
  CSS_TO_STYLES.set(newCSSText, newStyles);
}

export function $patchStyleText(
  selection: RangeSelection | GridSelection,
  patch: Record<string, string | null>,
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
  if (firstNode.is(lastNode)) {
    if ($isTextNode(firstNode)) {
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
    if (
      $isTextNode(firstNode) &&
      startOffset < firstNode.getTextContentSize()
    ) {
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
