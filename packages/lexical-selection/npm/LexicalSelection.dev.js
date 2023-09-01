/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const CSS_TO_STYLES = new Map();

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function getDOMTextNode(element) {
  let node = element;
  while (node != null) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }
    node = node.firstChild;
  }
  return null;
}
function getDOMIndexWithinParent(node) {
  const parent = node.parentNode;
  if (parent == null) {
    throw new Error('Should never happen');
  }
  return [parent, Array.from(parent.childNodes).indexOf(node)];
}

/**
 * Creates a selection range for the DOM.
 * @param editor - The lexical editor.
 * @param anchorNode - The anchor node of a selection.
 * @param _anchorOffset - The amount of space offset from the anchor to the focus.
 * @param focusNode - The current focus.
 * @param _focusOffset - The amount of space offset from the focus to the anchor.
 * @returns The range of selection for the DOM that was created.
 */
function createDOMRange(editor, anchorNode, _anchorOffset, focusNode, _focusOffset) {
  const anchorKey = anchorNode.getKey();
  const focusKey = focusNode.getKey();
  const range = document.createRange();
  let anchorDOM = editor.getElementByKey(anchorKey);
  let focusDOM = editor.getElementByKey(focusKey);
  let anchorOffset = _anchorOffset;
  let focusOffset = _focusOffset;
  if (lexical.$isTextNode(anchorNode)) {
    anchorDOM = getDOMTextNode(anchorDOM);
  }
  if (lexical.$isTextNode(focusNode)) {
    focusDOM = getDOMTextNode(focusDOM);
  }
  if (anchorNode === undefined || focusNode === undefined || anchorDOM === null || focusDOM === null) {
    return null;
  }
  if (anchorDOM.nodeName === 'BR') {
    [anchorDOM, anchorOffset] = getDOMIndexWithinParent(anchorDOM);
  }
  if (focusDOM.nodeName === 'BR') {
    [focusDOM, focusOffset] = getDOMIndexWithinParent(focusDOM);
  }
  const firstChild = anchorDOM.firstChild;
  if (anchorDOM === focusDOM && firstChild != null && firstChild.nodeName === 'BR' && anchorOffset === 0 && focusOffset === 0) {
    focusOffset = 1;
  }
  try {
    range.setStart(anchorDOM, anchorOffset);
    range.setEnd(focusDOM, focusOffset);
  } catch (e) {
    return null;
  }
  if (range.collapsed && (anchorOffset !== focusOffset || anchorKey !== focusKey)) {
    // Range is backwards, we need to reverse it
    range.setStart(focusDOM, focusOffset);
    range.setEnd(anchorDOM, anchorOffset);
  }
  return range;
}

/**
 * Creates DOMRects, generally used to help the editor find a specific location on the screen.
 * @param editor - The lexical editor
 * @param range - A fragment of a document that can contain nodes and parts of text nodes.
 * @returns The selectionRects as an array.
 */
function createRectsFromDOMRange(editor, range) {
  const rootElement = editor.getRootElement();
  if (rootElement === null) {
    return [];
  }
  const rootRect = rootElement.getBoundingClientRect();
  const computedStyle = getComputedStyle(rootElement);
  const rootPadding = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
  const selectionRects = Array.from(range.getClientRects());
  let selectionRectsLength = selectionRects.length;
  //sort rects from top left to bottom right.
  selectionRects.sort((a, b) => {
    const top = a.top - b.top;
    // Some rects match position closely, but not perfectly,
    // so we give a 3px tolerance.
    if (Math.abs(top) <= 3) {
      return a.left - b.left;
    }
    return top;
  });
  let prevRect;
  for (let i = 0; i < selectionRectsLength; i++) {
    const selectionRect = selectionRects[i];
    // Exclude rects that overlap preceding Rects in the sorted list.
    const isOverlappingRect = prevRect && prevRect.top <= selectionRect.top && prevRect.top + prevRect.height > selectionRect.top && prevRect.left + prevRect.width > selectionRect.left;
    // Exclude selections that span the entire element
    const selectionSpansElement = selectionRect.width + rootPadding === rootRect.width;
    if (isOverlappingRect || selectionSpansElement) {
      selectionRects.splice(i--, 1);
      selectionRectsLength--;
      continue;
    }
    prevRect = selectionRect;
  }
  return selectionRects;
}

/**
 * Creates an object containing all the styles and their values provided in the CSS string.
 * @param css - The CSS string of styles and their values.
 * @returns The styleObject containing all the styles and their values.
 */
function getStyleObjectFromRawCSS(css) {
  const styleObject = {};
  const styles = css.split(';');
  for (const style of styles) {
    if (style !== '') {
      const [key, value] = style.split(/:([^]+)/); // split on first colon
      styleObject[key.trim()] = value.trim();
    }
  }
  return styleObject;
}

/**
 * Given a CSS string, returns an object from the style cache.
 * @param css - The CSS property as a string.
 * @returns The value of the given CSS property.
 */
function getStyleObjectFromCSS(css) {
  let value = CSS_TO_STYLES.get(css);
  if (value === undefined) {
    value = getStyleObjectFromRawCSS(css);
    CSS_TO_STYLES.set(css, value);
  }
  {
    // Freeze the value in DEV to prevent accidental mutations
    Object.freeze(value);
  }
  return value;
}

/**
 * Gets the CSS styles from the style object.
 * @param styles - The style object containing the styles to get.
 * @returns A string containing the CSS styles and their values.
 */
function getCSSFromStyleObject(styles) {
  let css = '';
  for (const style in styles) {
    if (style) {
      css += `${style}: ${styles[style]};`;
    }
  }
  return css;
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
function $updateElementNodeProperties(target, source) {
  target.__first = source.__first;
  target.__last = source.__last;
  target.__size = source.__size;
  target.__format = source.__format;
  target.__indent = source.__indent;
  target.__dir = source.__dir;
  return target;
}
function $updateTextNodeProperties(target, source) {
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
function $cloneWithProperties(node) {
  const constructor = node.constructor;
  // @ts-expect-error
  const clone = constructor.clone(node);
  clone.__parent = node.__parent;
  clone.__next = node.__next;
  clone.__prev = node.__prev;
  if (lexical.$isElementNode(node) && lexical.$isElementNode(clone)) {
    return $updateElementNodeProperties(clone, node);
  }
  if (lexical.$isTextNode(node) && lexical.$isTextNode(clone)) {
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
function $sliceSelectedTextNodeContent(selection, textNode) {
  if (textNode.isSelected() && !textNode.isSegmented() && !textNode.isToken() && (lexical.$isRangeSelection(selection) || lexical.DEPRECATED_$isGridSelection(selection))) {
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
function $isAtNodeEnd(point) {
  if (point.type === 'text') {
    return point.offset === point.getNode().getTextContentSize();
  }
  return point.offset === point.getNode().getChildrenSize();
}

/**
 * Trims text from a node in order to shorten it, eg. to enforce a text's max length. If it deletes text
 * that is an ancestor of the anchor then it will leave 2 indents, otherwise, if no text content exists, it deletes
 * the TextNode. It will move the focus to either the end of any left over text or beginning of a new TextNode.
 * @param editor - The lexical editor.
 * @param anchor - The anchor of the current selection, where the selection should be pointing.
 * @param delCount - The amount of characters to delete. Useful as a dynamic variable eg. textContentSize - maxLength;
 */
function trimTextContentFromAnchor(editor, anchor, delCount) {
  // Work from the current selection anchor point
  let currentNode = anchor.getNode();
  let remaining = delCount;
  if (lexical.$isElementNode(currentNode)) {
    const descendantNode = currentNode.getDescendantByIndex(anchor.offset);
    if (descendantNode !== null) {
      currentNode = descendantNode;
    }
  }
  while (remaining > 0 && currentNode !== null) {
    let nextNode = currentNode.getPreviousSibling();
    let additionalElementWhitespace = 0;
    if (nextNode === null) {
      let parent = currentNode.getParentOrThrow();
      let parentSibling = parent.getPreviousSibling();
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
        if (lexical.$isElementNode(parentSibling)) {
          nextNode = parentSibling.getLastDescendant();
        } else {
          nextNode = parentSibling;
        }
      }
    }
    let text = currentNode.getTextContent();
    // If the text is empty, we need to consider adding in two line breaks to match
    // the content if we were to get it from its parent.
    if (text === '' && lexical.$isElementNode(currentNode) && !currentNode.isInline()) {
      // TODO: should this be handled in core?
      text = '\n\n';
    }
    const currentNodeSize = text.length;
    if (!lexical.$isTextNode(currentNode) || remaining >= currentNodeSize) {
      const parent = currentNode.getParent();
      currentNode.remove();
      if (parent != null && parent.getChildrenSize() === 0 && !lexical.$isRootNode(parent)) {
        parent.remove();
      }
      remaining -= currentNodeSize + additionalElementWhitespace;
      currentNode = nextNode;
    } else {
      const key = currentNode.getKey();
      // See if we can just revert it to what was in the last editor state
      const prevTextContent = editor.getEditorState().read(() => {
        const prevNode = lexical.$getNodeByKey(key);
        if (lexical.$isTextNode(prevNode) && prevNode.isSimpleText()) {
          return prevNode.getTextContent();
        }
        return null;
      });
      const offset = currentNodeSize - remaining;
      const slicedText = text.slice(0, offset);
      if (prevTextContent !== null && prevTextContent !== text) {
        const prevSelection = lexical.$getPreviousSelection();
        let target = currentNode;
        if (!currentNode.isSimpleText()) {
          const textNode = lexical.$createTextNode(prevTextContent);
          currentNode.replace(textNode);
          target = textNode;
        } else {
          currentNode.setTextContent(prevTextContent);
        }
        if (lexical.$isRangeSelection(prevSelection) && prevSelection.isCollapsed()) {
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
        const textNode = lexical.$createTextNode(slicedText);
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
function $addNodeStyle(node) {
  const CSSText = node.getStyle();
  const styles = getStyleObjectFromRawCSS(CSSText);
  CSS_TO_STYLES.set(CSSText, styles);
}
function $patchStyle(target, patch) {
  const prevStyles = getStyleObjectFromCSS('getStyle' in target ? target.getStyle() : target.style);
  const newStyles = Object.entries(patch).reduce((styles, [key, value]) => {
    if (value === null) {
      delete styles[key];
    } else {
      styles[key] = value;
    }
    return styles;
  }, {
    ...prevStyles
  } || {});
  const newCSSText = getCSSFromStyleObject(newStyles);
  target.setStyle(newCSSText);
  CSS_TO_STYLES.set(newCSSText, newStyles);
}

/**
 * Applies the provided styles to the TextNodes in the provided Selection.
 * Will update partially selected TextNodes by splitting the TextNode and applying
 * the styles to the appropriate one.
 * @param selection - The selected node(s) to update.
 * @param patch - The patch to apply, which can include multiple styles. { CSSProperty: value }
 */
function $patchStyleText(selection, patch) {
  const selectedNodes = selection.getNodes();
  const selectedNodesLength = selectedNodes.length;
  const lastIndex = selectedNodesLength - 1;
  let firstNode = selectedNodes[0];
  let lastNode = selectedNodes[lastIndex];
  if (selection.isCollapsed()) {
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
  if (lexical.$isTextNode(firstNode) && startOffset === firstNodeTextLength) {
    const nextSibling = firstNode.getNextSibling();
    if (lexical.$isTextNode(nextSibling)) {
      // we basically make the second node the firstNode, changing offsets accordingly
      anchorOffset = 0;
      startOffset = 0;
      firstNode = nextSibling;
    }
  }

  // This is the case where we only selected a single node
  if (selectedNodes.length === 1) {
    if (lexical.$isTextNode(firstNode)) {
      startOffset = startType === 'element' ? 0 : anchorOffset > focusOffset ? focusOffset : anchorOffset;
      endOffset = endType === 'element' ? firstNodeTextLength : anchorOffset > focusOffset ? anchorOffset : focusOffset;

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
    if (lexical.$isTextNode(firstNode) && startOffset < firstNode.getTextContentSize()) {
      if (startOffset !== 0) {
        // the entire first node isn't selected, so split it
        firstNode = firstNode.splitText(startOffset)[1];
        startOffset = 0;
      }
      $patchStyle(firstNode, patch);
    }
    if (lexical.$isTextNode(lastNode)) {
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
        $patchStyle(lastNode, patch);
      }
    }

    // style all the text nodes in between
    for (let i = 1; i < lastIndex; i++) {
      const selectedNode = selectedNodes[i];
      const selectedNodeKey = selectedNode.getKey();
      if (lexical.$isTextNode(selectedNode) && selectedNodeKey !== firstNode.getKey() && selectedNodeKey !== lastNode.getKey() && !selectedNode.isToken()) {
        $patchStyle(selectedNode, patch);
      }
    }
  }
}

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Converts all nodes in the selection that are of one block type to another.
 * @param selection - The selected blocks to be converted.
 * @param createElement - The function that creates the node. eg. $createParagraphNode.
 */
function $setBlocksType(selection, createElement) {
  if (selection.anchor.key === 'root') {
    const element = createElement();
    const root = lexical.$getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild) {
      firstChild.replace(element, true);
    } else {
      root.append(element);
    }
    return;
  }
  const nodes = selection.getNodes();
  let maybeBlock = selection.anchor.getNode().getParentOrThrow();
  if (nodes.indexOf(maybeBlock) === -1) {
    nodes.push(maybeBlock);
  }
  if (maybeBlock.isInline()) {
    maybeBlock = maybeBlock.getParentOrThrow();
    if (nodes.indexOf(maybeBlock) === -1) {
      nodes.push(maybeBlock);
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isBlock(node)) {
      continue;
    }
    const targetElement = createElement();
    targetElement.setFormat(node.getFormatType());
    targetElement.setIndent(node.getIndent());
    node.replace(targetElement, true);
  }
}
function isBlock(node) {
  if (!lexical.$isElementNode(node) || lexical.$isRootOrShadowRoot(node)) {
    return false;
  }
  const firstChild = node.getFirstChild();
  const isLeafElement = firstChild === null || lexical.$isLineBreakNode(firstChild) || lexical.$isTextNode(firstChild) || firstChild.isInline();
  return !node.isInline() && node.canBeEmpty() !== false && isLeafElement;
}
function isPointAttached(point) {
  return point.getNode().isAttached();
}
function $removeParentEmptyElements(startingNode) {
  let node = startingNode;
  while (node !== null && !lexical.$isRootOrShadowRoot(node)) {
    const latest = node.getLatest();
    const parentNode = node.getParent();
    if (latest.getChildrenSize() === 0) {
      node.remove(true);
    }
    node = parentNode;
  }
}

/**
 * @deprecated
 * Wraps all nodes in the selection into another node of the type returned by createElement.
 * @param selection - The selection of nodes to be wrapped.
 * @param createElement - A function that creates the wrapping ElementNode. eg. $createParagraphNode.
 * @param wrappingElement - An element to append the wrapped selection and its children to.
 */
function $wrapNodes(selection, createElement, wrappingElement = null) {
  const nodes = selection.getNodes();
  const nodesLength = nodes.length;
  const anchor = selection.anchor;
  if (nodesLength === 0 || nodesLength === 1 && anchor.type === 'element' && anchor.getNode().getChildrenSize() === 0) {
    const target = anchor.type === 'text' ? anchor.getNode().getParentOrThrow() : anchor.getNode();
    const children = target.getChildren();
    let element = createElement();
    element.setFormat(target.getFormatType());
    element.setIndent(target.getIndent());
    children.forEach(child => element.append(child));
    if (wrappingElement) {
      element = wrappingElement.append(element);
    }
    target.replace(element);
    return;
  }
  let topLevelNode = null;
  let descendants = [];
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    // Determine whether wrapping has to be broken down into multiple chunks. This can happen if the
    // user selected multiple Root-like nodes that have to be treated separately as if they are
    // their own branch. I.e. you don't want to wrap a whole table, but rather the contents of each
    // of each of the cell nodes.
    if (lexical.$isRootOrShadowRoot(node)) {
      $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
      descendants = [];
      topLevelNode = node;
    } else if (topLevelNode === null || topLevelNode !== null && lexical.$hasAncestor(node, topLevelNode)) {
      descendants.push(node);
    } else {
      $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
      descendants = [node];
    }
  }
  $wrapNodesImpl(selection, descendants, descendants.length, createElement, wrappingElement);
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
function $wrapNodesImpl(selection, nodes, nodesLength, createElement, wrappingElement = null) {
  if (nodes.length === 0) {
    return;
  }
  const firstNode = nodes[0];
  const elementMapping = new Map();
  const elements = [];
  // The below logic is to find the right target for us to
  // either insertAfter/insertBefore/append the corresponding
  // elements to. This is made more complicated due to nested
  // structures.
  let target = lexical.$isElementNode(firstNode) ? firstNode : firstNode.getParentOrThrow();
  if (target.isInline()) {
    target = target.getParentOrThrow();
  }
  let targetIsPrevSibling = false;
  while (target !== null) {
    const prevSibling = target.getPreviousSibling();
    if (prevSibling !== null) {
      target = prevSibling;
      targetIsPrevSibling = true;
      break;
    }
    target = target.getParentOrThrow();
    if (lexical.$isRootOrShadowRoot(target)) {
      break;
    }
  }
  const emptyElements = new Set();

  // Find any top level empty elements
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if (lexical.$isElementNode(node) && node.getChildrenSize() === 0) {
      emptyElements.add(node.getKey());
    }
  }
  const movedNodes = new Set();

  // Move out all leaf nodes into our elements array.
  // If we find a top level empty element, also move make
  // an element for that.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    let parent = node.getParent();
    if (parent !== null && parent.isInline()) {
      parent = parent.getParent();
    }
    if (parent !== null && lexical.$isLeafNode(node) && !movedNodes.has(node.getKey())) {
      const parentKey = parent.getKey();
      if (elementMapping.get(parentKey) === undefined) {
        const targetElement = createElement();
        targetElement.setFormat(parent.getFormatType());
        targetElement.setIndent(parent.getIndent());
        elements.push(targetElement);
        elementMapping.set(parentKey, targetElement);
        // Move node and its siblings to the new
        // element.
        parent.getChildren().forEach(child => {
          targetElement.append(child);
          movedNodes.add(child.getKey());
          if (lexical.$isElementNode(child)) {
            // Skip nested leaf nodes if the parent has already been moved
            child.getChildrenKeys().forEach(key => movedNodes.add(key));
          }
        });
        $removeParentEmptyElements(parent);
      }
    } else if (emptyElements.has(node.getKey())) {
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
  if (lexical.$isRootOrShadowRoot(target)) {
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
      if (lexical.$isElementNode(firstChild)) {
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
  const prevSelection = lexical.$getPreviousSelection();
  if (lexical.$isRangeSelection(prevSelection) && isPointAttached(prevSelection.anchor) && isPointAttached(prevSelection.focus)) {
    lexical.$setSelection(prevSelection.clone());
  } else if (lastElement !== null) {
    lastElement.selectEnd();
  } else {
    selection.dirty = true;
  }
}

/**
 * Determines if the default character selection should be overridden. Used with DecoratorNodes
 * @param selection - The selection whose default character selection may need to be overridden.
 * @param isBackward - Is the selection backwards (the focus comes before the anchor)?
 * @returns true if it should be overridden, false if not.
 */
function $shouldOverrideDefaultCharacterSelection(selection, isBackward) {
  const possibleNode = lexical.$getAdjacentNode(selection.focus, isBackward);
  return lexical.$isDecoratorNode(possibleNode) && !possibleNode.isIsolated() || lexical.$isElementNode(possibleNode) && !possibleNode.isInline() && !possibleNode.canBeEmpty();
}

/**
 * Moves the selection according to the arguments.
 * @param selection - The selected text or nodes.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection selected backwards (the focus comes before the anchor)?
 * @param granularity - The distance to adjust the current selection.
 */
function $moveCaretSelection(selection, isHoldingShift, isBackward, granularity) {
  selection.modify(isHoldingShift ? 'extend' : 'move', isBackward, granularity);
}

/**
 * Tests a parent element for right to left direction.
 * @param selection - The selection whose parent is to be tested.
 * @returns true if the selections' parent element has a direction of 'rtl' (right to left), false otherwise.
 */
function $isParentElementRTL(selection) {
  const anchorNode = selection.anchor.getNode();
  const parent = lexical.$isRootNode(anchorNode) ? anchorNode : anchorNode.getParentOrThrow();
  return parent.getDirection() === 'rtl';
}

/**
 * Moves selection by character according to arguments.
 * @param selection - The selection of the characters to move.
 * @param isHoldingShift - Is the shift key being held down during the operation.
 * @param isBackward - Is the selection backward (the focus comes before the anchor)?
 */
function $moveCharacter(selection, isHoldingShift, isBackward) {
  const isRTL = $isParentElementRTL(selection);
  $moveCaretSelection(selection, isHoldingShift, isBackward ? !isRTL : isRTL, 'character');
}

/**
 * Expands the current Selection to cover all of the content in the editor.
 * @param selection - The current selection.
 */
function $selectAll(selection) {
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
  if (lexical.$isTextNode(firstNode)) {
    firstType = 'text';
  } else if (!lexical.$isElementNode(firstNode) && firstNode !== null) {
    firstNode = firstNode.getParentOrThrow();
  }
  if (lexical.$isTextNode(lastNode)) {
    lastType = 'text';
    lastOffset = lastNode.getTextContentSize();
  } else if (!lexical.$isElementNode(lastNode) && lastNode !== null) {
    lastNode = lastNode.getParentOrThrow();
  }
  if (firstNode && lastNode) {
    anchor.set(firstNode.getKey(), 0, firstType);
    focus.set(lastNode.getKey(), lastOffset, lastType);
  }
}

/**
 * Returns the current value of a CSS property for Nodes, if set. If not set, it returns the defaultValue.
 * @param node - The node whose style value to get.
 * @param styleProperty - The CSS style property.
 * @param defaultValue - The default value for the property.
 * @returns The value of the property for node.
 */
function $getNodeStyleValueForProperty(node, styleProperty, defaultValue) {
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
function $getSelectionStyleValueForProperty(selection, styleProperty, defaultValue = '') {
  let styleValue = null;
  const nodes = selection.getNodes();
  const anchor = selection.anchor;
  const focus = selection.focus;
  const isBackward = selection.isBackward();
  const endOffset = isBackward ? focus.offset : anchor.offset;
  const endNode = isBackward ? focus.getNode() : anchor.getNode();
  if (selection.style !== '') {
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
    if (lexical.$isTextNode(node)) {
      const nodeStyleValue = $getNodeStyleValueForProperty(node, styleProperty, defaultValue);
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

exports.$addNodeStyle = $addNodeStyle;
exports.$cloneWithProperties = $cloneWithProperties;
exports.$getSelectionStyleValueForProperty = $getSelectionStyleValueForProperty;
exports.$isAtNodeEnd = $isAtNodeEnd;
exports.$isParentElementRTL = $isParentElementRTL;
exports.$moveCaretSelection = $moveCaretSelection;
exports.$moveCharacter = $moveCharacter;
exports.$patchStyleText = $patchStyleText;
exports.$selectAll = $selectAll;
exports.$setBlocksType = $setBlocksType;
exports.$shouldOverrideDefaultCharacterSelection = $shouldOverrideDefaultCharacterSelection;
exports.$sliceSelectedTextNodeContent = $sliceSelectedTextNodeContent;
exports.$wrapNodes = $wrapNodes;
exports.createDOMRange = createDOMRange;
exports.createRectsFromDOMRange = createRectsFromDOMRange;
exports.getStyleObjectFromCSS = getStyleObjectFromCSS;
exports.trimTextContentFromAnchor = trimTextContentFromAnchor;
