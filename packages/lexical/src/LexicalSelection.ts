/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {NodeKey} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextFormatType} from './nodes/LexicalTextNode';

import invariant from 'shared/invariant';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
  TextNode,
} from '.';
import {DOM_ELEMENT_TYPE, TEXT_TYPE_TO_FORMAT} from './LexicalConstants';
import {
  markCollapsedSelectionFormat,
  markSelectionChangeFromDOMUpdate,
} from './LexicalEvents';
import {getIsProcessingMutations} from './LexicalMutations';
import {insertRangeAfter, LexicalNode} from './LexicalNode';
import {
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from './LexicalUpdates';
import {
  $getAdjacentNode,
  $getAncestor,
  $getCompositionKey,
  $getNearestRootOrShadowRoot,
  $getNodeByKey,
  $getRoot,
  $hasAncestor,
  $isTokenOrSegmented,
  $setCompositionKey,
  doesContainGrapheme,
  getDOMSelection,
  getDOMTextNode,
  getElementByKeyOrThrow,
  getNodeFromDOM,
  getTextNodeOffset,
  INTERNAL_$isBlock,
  isSelectionCapturedInDecoratorInput,
  isSelectionWithinEditor,
  removeDOMBlockCursorElement,
  scrollIntoViewIfNeeded,
  toggleTextFormatType,
} from './LexicalUtils';
import {$createTabNode, $isTabNode} from './nodes/LexicalTabNode';

export type TextPointType = {
  _selection: BaseSelection;
  getNode: () => TextNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  type: 'text';
};

export type ElementPointType = {
  _selection: BaseSelection;
  getNode: () => ElementNode;
  is: (point: PointType) => boolean;
  isBefore: (point: PointType) => boolean;
  key: NodeKey;
  offset: number;
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
  type: 'element';
};

export type PointType = TextPointType | ElementPointType;

export class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  _selection: BaseSelection | null;

  constructor(key: NodeKey, offset: number, type: 'text' | 'element') {
    this._selection = null;
    this.key = key;
    this.offset = offset;
    this.type = type;
  }

  is(point: PointType): boolean {
    return (
      this.key === point.key &&
      this.offset === point.offset &&
      this.type === point.type
    );
  }

  isBefore(b: PointType): boolean {
    let aNode = this.getNode();
    let bNode = b.getNode();
    const aOffset = this.offset;
    const bOffset = b.offset;

    if ($isElementNode(aNode)) {
      const aNodeDescendant = aNode.getDescendantByIndex<ElementNode>(aOffset);
      aNode = aNodeDescendant != null ? aNodeDescendant : aNode;
    }
    if ($isElementNode(bNode)) {
      const bNodeDescendant = bNode.getDescendantByIndex<ElementNode>(bOffset);
      bNode = bNodeDescendant != null ? bNodeDescendant : bNode;
    }
    if (aNode === bNode) {
      return aOffset < bOffset;
    }
    return aNode.isBefore(bNode);
  }

  getNode(): LexicalNode {
    const key = this.key;
    const node = $getNodeByKey(key);
    if (node === null) {
      invariant(false, 'Point.getNode: node not found');
    }
    return node;
  }

  set(key: NodeKey, offset: number, type: 'text' | 'element'): void {
    const selection = this._selection;
    const oldKey = this.key;
    this.key = key;
    this.offset = offset;
    this.type = type;
    if (!isCurrentlyReadOnlyMode()) {
      if ($getCompositionKey() === oldKey) {
        $setCompositionKey(key);
      }
      if (selection !== null) {
        selection.setCachedNodes(null);
        selection.dirty = true;
      }
    }
  }
}

export function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

function selectPointOnNode(point: PointType, node: LexicalNode): void {
  let key = node.__key;
  let offset = point.offset;
  let type: 'element' | 'text' = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  } else if (!$isElementNode(node)) {
    const nextSibling = node.getNextSibling();
    if ($isTextNode(nextSibling)) {
      key = nextSibling.__key;
      offset = 0;
      type = 'text';
    } else {
      const parentNode = node.getParent();
      if (parentNode) {
        key = parentNode.__key;
        offset = node.getIndexWithinParent() + 1;
      }
    }
  }
  point.set(key, offset, type);
}

export function $moveSelectionPointToEnd(
  point: PointType,
  node: LexicalNode,
): void {
  if ($isElementNode(node)) {
    const lastNode = node.getLastDescendant();
    if ($isElementNode(lastNode) || $isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else {
    selectPointOnNode(point, node);
  }
}

function $transferStartingElementPointToTextPoint(
  start: ElementPointType,
  end: PointType,
  format: number,
  style: string,
): void {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  const target = $isRootNode(element)
    ? $createParagraphNode().append(textNode)
    : textNode;
  textNode.setFormat(format);
  textNode.setStyle(style);
  if (placementNode === null) {
    element.append(target);
  } else {
    placementNode.insertBefore(target);
  }
  // Transfer the element point to a text point.
  if (start.is(end)) {
    end.set(textNode.__key, 0, 'text');
  }
  start.set(textNode.__key, 0, 'text');
}

function $setPointValues(
  point: PointType,
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): void {
  point.key = key;
  point.offset = offset;
  point.type = type;
}

export interface BaseSelection {
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  clone(): BaseSelection;
  extract(): Array<LexicalNode>;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
  insertText(text: string): void;
  insertRawText(text: string): void;
  is(selection: null | BaseSelection): boolean;
  insertNodes(nodes: Array<LexicalNode>): void;
  getStartEndPoints(): null | [PointType, PointType];
  isCollapsed(): boolean;
  isBackward(): boolean;
  getCachedNodes(): LexicalNode[] | null;
  setCachedNodes(nodes: LexicalNode[] | null): void;
}

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(objects: Set<NodeKey>) {
    this._cachedNodes = null;
    this._nodes = objects;
    this.dirty = false;
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes;
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes;
  }

  is(selection: null | BaseSelection): boolean {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a: Set<NodeKey> = this._nodes;
    const b: Set<NodeKey> = selection._nodes;
    return a.size === b.size && Array.from(a).every((key) => b.has(key));
  }

  isCollapsed(): boolean {
    return false;
  }

  isBackward(): boolean {
    return false;
  }

  getStartEndPoints(): null {
    return null;
  }

  add(key: NodeKey): void {
    this.dirty = true;
    this._nodes.add(key);
    this._cachedNodes = null;
  }

  delete(key: NodeKey): void {
    this.dirty = true;
    this._nodes.delete(key);
    this._cachedNodes = null;
  }

  clear(): void {
    this.dirty = true;
    this._nodes.clear();
    this._cachedNodes = null;
  }

  has(key: NodeKey): boolean {
    return this._nodes.has(key);
  }

  clone(): NodeSelection {
    return new NodeSelection(new Set(this._nodes));
  }

  extract(): Array<LexicalNode> {
    return this.getNodes();
  }

  insertRawText(text: string): void {
    // Do nothing?
  }

  insertText(): void {
    // Do nothing?
  }

  insertNodes(nodes: Array<LexicalNode>) {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastSelectedNode = selectedNodes[selectedNodesLength - 1];
    let selectionAtEnd: RangeSelection;
    // Insert nodes
    if ($isTextNode(lastSelectedNode)) {
      selectionAtEnd = lastSelectedNode.select();
    } else {
      const index = lastSelectedNode.getIndexWithinParent() + 1;
      selectionAtEnd = lastSelectedNode.getParentOrThrow().select(index, index);
    }
    selectionAtEnd.insertNodes(nodes);
    // Remove selected nodes
    for (let i = 0; i < selectedNodesLength; i++) {
      selectedNodes[i].remove();
    }
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const objects = this._nodes;
    const nodes = [];
    for (const object of objects) {
      const node = $getNodeByKey(object);
      if (node !== null) {
        nodes.push(node);
      }
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  getTextContent(): string {
    const nodes = this.getNodes();
    let textContent = '';
    for (let i = 0; i < nodes.length; i++) {
      textContent += nodes[i].getTextContent();
    }
    return textContent;
  }
}

export function $isRangeSelection(x: unknown): x is RangeSelection {
  return x instanceof RangeSelection;
}

export class RangeSelection implements BaseSelection {
  format: number;
  style: string;
  anchor: PointType;
  focus: PointType;
  _cachedNodes: Array<LexicalNode> | null;
  dirty: boolean;

  constructor(
    anchor: PointType,
    focus: PointType,
    format: number,
    style: string,
  ) {
    this.anchor = anchor;
    this.focus = focus;
    anchor._selection = this;
    focus._selection = this;
    this._cachedNodes = null;
    this.format = format;
    this.style = style;
    this.dirty = false;
  }

  getCachedNodes(): LexicalNode[] | null {
    return this._cachedNodes;
  }

  setCachedNodes(nodes: LexicalNode[] | null): void {
    this._cachedNodes = nodes;
  }

  /**
   * Used to check if the provided selections is equal to this one by value,
   * inluding anchor, focus, format, and style properties.
   * @param selection - the Selection to compare this one to.
   * @returns true if the Selections are equal, false otherwise.
   */
  is(selection: null | BaseSelection): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return (
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus) &&
      this.format === selection.format &&
      this.style === selection.style
    );
  }

  /**
   * Returns whether the Selection is "collapsed", meaning the anchor and focus are
   * the same node and have the same offset.
   *
   * @returns true if the Selection is collapsed, false otherwise.
   */
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }

  /**
   * Gets all the nodes in the Selection. Uses caching to make it generally suitable
   * for use in hot paths.
   *
   * @returns an Array containing all the nodes in the Selection
   */
  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const firstPoint = isBefore ? anchor : focus;
    const lastPoint = isBefore ? focus : anchor;
    let firstNode = firstPoint.getNode();
    let lastNode = lastPoint.getNode();
    const startOffset = firstPoint.offset;
    const endOffset = lastPoint.offset;

    if ($isElementNode(firstNode)) {
      const firstNodeDescendant =
        firstNode.getDescendantByIndex<ElementNode>(startOffset);
      firstNode = firstNodeDescendant != null ? firstNodeDescendant : firstNode;
    }
    if ($isElementNode(lastNode)) {
      let lastNodeDescendant =
        lastNode.getDescendantByIndex<ElementNode>(endOffset);
      // We don't want to over-select, as node selection infers the child before
      // the last descendant, not including that descendant.
      if (
        lastNodeDescendant !== null &&
        lastNodeDescendant !== firstNode &&
        lastNode.getChildAtIndex(endOffset) === lastNodeDescendant
      ) {
        lastNodeDescendant = lastNodeDescendant.getPreviousSibling();
      }
      lastNode = lastNodeDescendant != null ? lastNodeDescendant : lastNode;
    }

    let nodes: Array<LexicalNode>;

    if (firstNode.is(lastNode)) {
      if ($isElementNode(firstNode) && firstNode.getChildrenSize() > 0) {
        nodes = [];
      } else {
        nodes = [firstNode];
      }
    } else {
      nodes = firstNode.getNodesBetween(lastNode);
    }
    if (!isCurrentlyReadOnlyMode()) {
      this._cachedNodes = nodes;
    }
    return nodes;
  }

  /**
   * Sets this Selection to be of type "text" at the provided anchor and focus values.
   *
   * @param anchorNode - the anchor node to set on the Selection
   * @param anchorOffset - the offset to set on the Selection
   * @param focusNode - the focus node to set on the Selection
   * @param focusOffset - the focus offset to set on the Selection
   */
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    $setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'text');
    $setPointValues(this.focus, focusNode.__key, focusOffset, 'text');
    this._cachedNodes = null;
    this.dirty = true;
  }

  /**
   * Gets the (plain) text content of all the nodes in the selection.
   *
   * @returns a string representing the text content of all the nodes in the Selection
   */
  getTextContent(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = anchor.isBefore(focus);
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);
    let textContent = '';
    let prevWasElement = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        if (!prevWasElement) {
          textContent += '\n';
        }
        if (node.isEmpty()) {
          prevWasElement = false;
        } else {
          prevWasElement = true;
        }
      } else {
        prevWasElement = false;
        if ($isTextNode(node)) {
          let text = node.getTextContent();
          if (node === firstNode) {
            if (node === lastNode) {
              if (
                anchor.type !== 'element' ||
                focus.type !== 'element' ||
                focus.offset === anchor.offset
              ) {
                text =
                  anchorOffset < focusOffset
                    ? text.slice(anchorOffset, focusOffset)
                    : text.slice(focusOffset, anchorOffset);
              }
            } else {
              text = isBefore
                ? text.slice(anchorOffset)
                : text.slice(focusOffset);
            }
          } else if (node === lastNode) {
            text = isBefore
              ? text.slice(0, focusOffset)
              : text.slice(0, anchorOffset);
          }
          textContent += text;
        } else if (
          ($isDecoratorNode(node) || $isLineBreakNode(node)) &&
          (node !== lastNode || !this.isCollapsed())
        ) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }

  /**
   * Attempts to map a DOM selection range onto this Lexical Selection,
   * setting the anchor, focus, and type accordingly
   *
   * @param range a DOM Selection range conforming to the StaticRange interface.
   */
  applyDOMRange(range: StaticRange): void {
    const editor = getActiveEditor();
    const currentEditorState = editor.getEditorState();
    const lastSelection = currentEditorState._selection;
    const resolvedSelectionPoints = internalResolveSelectionPoints(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
      lastSelection,
    );
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints;
    $setPointValues(
      this.anchor,
      anchorPoint.key,
      anchorPoint.offset,
      anchorPoint.type,
    );
    $setPointValues(
      this.focus,
      focusPoint.key,
      focusPoint.offset,
      focusPoint.type,
    );
    this._cachedNodes = null;
  }

  /**
   * Creates a new RangeSelection, copying over all the property values from this one.
   *
   * @returns a new RangeSelection with the same property values as this one.
   */
  clone(): RangeSelection {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
      this.style,
    );
    return selection;
  }

  /**
   * Toggles the provided format on all the TextNodes in the Selection.
   *
   * @param format a string TextFormatType to toggle on the TextNodes in the selection
   */
  toggleFormat(format: TextFormatType): void {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  /**
   * Sets the value of the style property on the Selection
   *
   * @param style - the style to set at the value of the style property.
   */
  setStyle(style: string): void {
    this.style = style;
    this.dirty = true;
  }

  /**
   * Returns whether the provided TextFormatType is present on the Selection. This will be true if any node in the Selection
   * has the specified format.
   *
   * @param type the TextFormatType to check for.
   * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
   */
  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection.
   * converts tabs, newlines, and carriage returns into LexicalNodes.
   *
   * @param text the text to insert into the Selection
   */
  insertRawText(text: string): void {
    const parts = text.split(/(\r?\n|\t)/);
    const nodes = [];
    const length = parts.length;
    for (let i = 0; i < length; i++) {
      const part = parts[i];
      if (part === '\n' || part === '\r\n') {
        nodes.push($createLineBreakNode());
      } else if (part === '\t') {
        nodes.push($createTabNode());
      } else {
        nodes.push($createTextNode(part));
      }
    }
    this.insertNodes(nodes);
  }

  /**
   * Attempts to insert the provided text into the EditorState at the current Selection as a new
   * Lexical TextNode, according to a series of insertion heuristics based on the selection type and position.
   *
   * @param text the text to insert into the Selection
   */
  insertText(text: string): void {
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = this.isCollapsed() || anchor.isBefore(focus);
    const format = this.format;
    const style = this.style;
    if (isBefore && anchor.type === 'element') {
      $transferStartingElementPointToTextPoint(anchor, focus, format, style);
    } else if (!isBefore && focus.type === 'element') {
      $transferStartingElementPointToTextPoint(focus, anchor, format, style);
    }
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const firstPoint = isBefore ? anchor : focus;
    const endPoint = isBefore ? focus : anchor;
    const startOffset = firstPoint.offset;
    const endOffset = endPoint.offset;
    let firstNode: TextNode = selectedNodes[0] as TextNode;

    if (!$isTextNode(firstNode)) {
      invariant(false, 'insertText: first node is not a text node');
    }
    const firstNodeText = firstNode.getTextContent();
    const firstNodeTextLength = firstNodeText.length;
    const firstNodeParent = firstNode.getParentOrThrow();
    const lastIndex = selectedNodesLength - 1;
    let lastNode = selectedNodes[lastIndex];

    if (
      this.isCollapsed() &&
      startOffset === firstNodeTextLength &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextAfter() ||
        (!firstNodeParent.canInsertTextAfter() &&
          firstNode.getNextSibling() === null))
    ) {
      let nextSibling = firstNode.getNextSibling<TextNode>();
      if (
        !$isTextNode(nextSibling) ||
        !nextSibling.canInsertTextBefore() ||
        $isTokenOrSegmented(nextSibling)
      ) {
        nextSibling = $createTextNode();
        nextSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextAfter()) {
          firstNodeParent.insertAfter(nextSibling);
        } else {
          firstNode.insertAfter(nextSibling);
        }
      }
      nextSibling.select(0, 0);
      firstNode = nextSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (
      this.isCollapsed() &&
      startOffset === 0 &&
      (firstNode.isSegmented() ||
        firstNode.isToken() ||
        !firstNode.canInsertTextBefore() ||
        (!firstNodeParent.canInsertTextBefore() &&
          firstNode.getPreviousSibling() === null))
    ) {
      let prevSibling = firstNode.getPreviousSibling<TextNode>();
      if (!$isTextNode(prevSibling) || $isTokenOrSegmented(prevSibling)) {
        prevSibling = $createTextNode();
        prevSibling.setFormat(format);
        if (!firstNodeParent.canInsertTextBefore()) {
          firstNodeParent.insertBefore(prevSibling);
        } else {
          firstNode.insertBefore(prevSibling);
        }
      }
      prevSibling.select();
      firstNode = prevSibling;
      if (text !== '') {
        this.insertText(text);
        return;
      }
    } else if (firstNode.isSegmented() && startOffset !== firstNodeTextLength) {
      const textNode = $createTextNode(firstNode.getTextContent());
      textNode.setFormat(format);
      firstNode.replace(textNode);
      firstNode = textNode;
    } else if (!this.isCollapsed() && text !== '') {
      // When the firstNode or lastNode parents are elements that
      // do not allow text to be inserted before or after, we first
      // clear the content. Then we normalize selection, then insert
      // the new content.
      const lastNodeParent = lastNode.getParent();

      if (
        !firstNodeParent.canInsertTextBefore() ||
        !firstNodeParent.canInsertTextAfter() ||
        ($isElementNode(lastNodeParent) &&
          (!lastNodeParent.canInsertTextBefore() ||
            !lastNodeParent.canInsertTextAfter()))
      ) {
        this.insertText('');
        normalizeSelectionPointsForBoundaries(this.anchor, this.focus, null);
        this.insertText(text);
        return;
      }
    }

    if (selectedNodesLength === 1) {
      if (firstNode.isToken()) {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const firstNodeFormat = firstNode.getFormat();
      const firstNodeStyle = firstNode.getStyle();

      if (
        startOffset === endOffset &&
        (firstNodeFormat !== format || firstNodeStyle !== style)
      ) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format);
          firstNode.setStyle(style);
        } else {
          const textNode = $createTextNode(text);
          textNode.setFormat(format);
          textNode.setStyle(style);
          textNode.select();
          if (startOffset === 0) {
            firstNode.insertBefore(textNode, false);
          } else {
            const [targetNode] = firstNode.splitText(startOffset);
            targetNode.insertAfter(textNode, false);
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length;
          }
          return;
        }
      } else if ($isTabNode(firstNode)) {
        // We don't need to check for delCount because there is only the entire selected node case
        // that can hit here for content size 1 and with canInsertTextBeforeAfter false
        const textNode = $createTextNode(text);
        textNode.setFormat(format);
        textNode.setStyle(style);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const delCount = endOffset - startOffset;

      firstNode = firstNode.spliceText(startOffset, delCount, text, true);
      if (firstNode.getTextContent() === '') {
        firstNode.remove();
      } else if (this.anchor.type === 'text') {
        if (firstNode.isComposing()) {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        } else {
          this.format = firstNodeFormat;
          this.style = firstNodeStyle;
        }
      }
    } else {
      const markedNodeKeysForKeep = new Set([
        ...firstNode.getParentKeys(),
        ...lastNode.getParentKeys(),
      ]);

      // We have to get the parent elements before the next section,
      // as in that section we might mutate the lastNode.
      const firstElement = $isElementNode(firstNode)
        ? firstNode
        : firstNode.getParentOrThrow();
      let lastElement = $isElementNode(lastNode)
        ? lastNode
        : lastNode.getParentOrThrow();
      let lastElementChild = lastNode;

      // If the last element is inline, we should instead look at getting
      // the nodes of its parent, rather than itself. This behavior will
      // then better match how text node insertions work. We will need to
      // also update the last element's child accordingly as we do this.
      if (!firstElement.is(lastElement) && lastElement.isInline()) {
        // Keep traversing till we have a non-inline element parent.
        do {
          lastElementChild = lastElement;
          lastElement = lastElement.getParentOrThrow();
        } while (lastElement.isInline());
      }

      // Handle mutations to the last node.
      if (
        (endPoint.type === 'text' &&
          (endOffset !== 0 || lastNode.getTextContent() === '')) ||
        (endPoint.type === 'element' &&
          lastNode.getIndexWithinParent() < endOffset)
      ) {
        if (
          $isTextNode(lastNode) &&
          !lastNode.isToken() &&
          endOffset !== lastNode.getTextContentSize()
        ) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent());
            lastNode.replace(textNode);
            lastNode = textNode;
          }
          // root node selections only select whole nodes, so no text splice is necessary
          if (!$isRootNode(endPoint.getNode()) && endPoint.type === 'text') {
            lastNode = (lastNode as TextNode).spliceText(0, endOffset, '');
          }
          markedNodeKeysForKeep.add(lastNode.__key);
        } else {
          const lastNodeParent = lastNode.getParentOrThrow();
          if (
            !lastNodeParent.canBeEmpty() &&
            lastNodeParent.getChildrenSize() === 1
          ) {
            lastNodeParent.remove();
          } else {
            lastNode.remove();
          }
        }
      } else {
        markedNodeKeysForKeep.add(lastNode.__key);
      }

      // Either move the remaining nodes of the last parent to after
      // the first child, or remove them entirely. If the last parent
      // is the same as the first parent, this logic also works.
      const lastNodeChildren = lastElement.getChildren();
      const selectedNodesSet = new Set(selectedNodes);
      const firstAndLastElementsAreEqual = firstElement.is(lastElement);

      // We choose a target to insert all nodes after. In the case of having
      // and inline starting parent element with a starting node that has no
      // siblings, we should insert after the starting parent element, otherwise
      // we will incorrectly merge into the starting parent element.
      // TODO: should we keep on traversing parents if we're inside another
      // nested inline element?
      const insertionTarget =
        firstElement.isInline() && firstNode.getNextSibling() === null
          ? firstElement
          : firstNode;

      for (let i = lastNodeChildren.length - 1; i >= 0; i--) {
        const lastNodeChild = lastNodeChildren[i];

        if (
          lastNodeChild.is(firstNode) ||
          ($isElementNode(lastNodeChild) && lastNodeChild.isParentOf(firstNode))
        ) {
          break;
        }

        if (lastNodeChild.isAttached()) {
          if (
            !selectedNodesSet.has(lastNodeChild) ||
            lastNodeChild.is(lastElementChild)
          ) {
            if (!firstAndLastElementsAreEqual) {
              insertionTarget.insertAfter(lastNodeChild, false);
            }
          } else {
            lastNodeChild.remove();
          }
        }
      }

      if (!firstAndLastElementsAreEqual) {
        // Check if we have already moved out all the nodes of the
        // last parent, and if so, traverse the parent tree and mark
        // them all as being able to deleted too.
        let parent: ElementNode | null = lastElement;
        let lastRemovedParent = null;

        while (parent !== null) {
          const children = parent.getChildren();
          const childrenLength = children.length;
          if (
            childrenLength === 0 ||
            children[childrenLength - 1].is(lastRemovedParent)
          ) {
            markedNodeKeysForKeep.delete(parent.__key);
            lastRemovedParent = parent;
          }
          parent = parent.getParent();
        }
      }

      // Ensure we do splicing after moving of nodes, as splicing
      // can have side-effects (in the case of hashtags).
      if (!firstNode.isToken()) {
        firstNode = firstNode.spliceText(
          startOffset,
          firstNodeTextLength - startOffset,
          text,
          true,
        );
        if (firstNode.getTextContent() === '') {
          firstNode.remove();
        } else if (firstNode.isComposing() && this.anchor.type === 'text') {
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          this.anchor.offset -= text.length;
        }
      } else if (startOffset === firstNodeTextLength) {
        firstNode.select();
      } else {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
      }

      // Remove all selected nodes that haven't already been removed.
      for (let i = 1; i < selectedNodesLength; i++) {
        const selectedNode = selectedNodes[i];
        const key = selectedNode.__key;
        if (!markedNodeKeysForKeep.has(key)) {
          selectedNode.remove();
        }
      }
    }
  }

  /**
   * Removes the text in the Selection, adjusting the EditorState accordingly.
   */
  removeText(): void {
    this.insertText('');
  }

  /**
   * Applies the provided format to the TextNodes in the Selection, splitting or
   * merging nodes as necessary.
   *
   * @param formatType the format type to apply to the nodes in the Selection.
   */
  formatText(formatType: TextFormatType): void {
    if (this.isCollapsed()) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }

    const selectedNodes = this.getNodes();
    const selectedTextNodes: Array<TextNode> = [];
    for (const selectedNode of selectedNodes) {
      if ($isTextNode(selectedNode)) {
        selectedTextNodes.push(selectedNode);
      }
    }

    const selectedTextNodesLength = selectedTextNodes.length;
    if (selectedTextNodesLength === 0) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }

    const anchor = this.anchor;
    const focus = this.focus;
    const isBackward = this.isBackward();
    const startPoint = isBackward ? focus : anchor;
    const endPoint = isBackward ? anchor : focus;

    let firstIndex = 0;
    let firstNode = selectedTextNodes[0];
    let startOffset = startPoint.type === 'element' ? 0 : startPoint.offset;

    // In case selection started at the end of text node use next text node
    if (
      startPoint.type === 'text' &&
      startOffset === firstNode.getTextContentSize()
    ) {
      firstIndex = 1;
      firstNode = selectedTextNodes[1];
      startOffset = 0;
    }

    if (firstNode == null) {
      return;
    }

    const firstNextFormat = firstNode.getFormatFlags(formatType, null);

    const lastIndex = selectedTextNodesLength - 1;
    let lastNode = selectedTextNodes[lastIndex];
    const endOffset =
      endPoint.type === 'text'
        ? endPoint.offset
        : lastNode.getTextContentSize();

    // Single node selected
    if (firstNode.is(lastNode)) {
      // No actual text is selected, so do nothing.
      if (startOffset === endOffset) {
        return;
      }
      // The entire node is selected, so just format it
      if (startOffset === 0 && endOffset === firstNode.getTextContentSize()) {
        firstNode.setFormat(firstNextFormat);
      } else {
        // Node is partially selected, so split it into two nodes
        // add style the selected one.
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        replacement.setFormat(firstNextFormat);

        // Update selection only if starts/ends on text node
        if (startPoint.type === 'text') {
          startPoint.set(replacement.__key, 0, 'text');
        }
        if (endPoint.type === 'text') {
          endPoint.set(replacement.__key, endOffset - startOffset, 'text');
        }
      }

      this.format = firstNextFormat;

      return;
    }
    // Multiple nodes selected
    // The entire first node isn't selected, so split it
    if (startOffset !== 0) {
      [, firstNode as TextNode] = firstNode.splitText(startOffset);
      startOffset = 0;
    }
    firstNode.setFormat(firstNextFormat);

    const lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat);
    // If the offset is 0, it means no actual characters are selected,
    // so we skip formatting the last node altogether.
    if (endOffset > 0) {
      if (endOffset !== lastNode.getTextContentSize()) {
        [lastNode as TextNode] = lastNode.splitText(endOffset);
      }
      lastNode.setFormat(lastNextFormat);
    }

    // Process all text nodes in between
    for (let i = firstIndex + 1; i < lastIndex; i++) {
      const textNode = selectedTextNodes[i];
      if (!textNode.isToken()) {
        const nextFormat = textNode.getFormatFlags(formatType, lastNextFormat);
        textNode.setFormat(nextFormat);
      }
    }

    // Update selection only if starts/ends on text node
    if (startPoint.type === 'text') {
      startPoint.set(firstNode.__key, startOffset, 'text');
    }
    if (endPoint.type === 'text') {
      endPoint.set(lastNode.__key, endOffset, 'text');
    }

    this.format = firstNextFormat | lastNextFormat;
  }

  /**
   * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
   * current Selection according to a set of heuristics that determine how surrounding nodes
   * should be changed, replaced, or moved to accomodate the incoming ones.
   *
   * @param nodes - the nodes to insert
   */
  insertNodes(nodes: Array<LexicalNode>): void {
    if (nodes.length === 0) {
      return;
    }
    if (this.anchor.key === 'root') {
      this.insertParagraph();
      const selection = $getSelection();
      invariant(
        $isRangeSelection(selection),
        'Expected RangeSelection after insertParagraph',
      );
      return selection.insertNodes(nodes);
    }

    const firstPoint = this.isBackward() ? this.focus : this.anchor;
    const firstBlock = $getAncestor(firstPoint.getNode(), INTERNAL_$isBlock)!;

    const last = nodes[nodes.length - 1]!;

    // CASE 1: insert inside a code block
    if ('__language' in firstBlock && $isElementNode(firstBlock)) {
      if ('__language' in nodes[0]) {
        this.insertText(nodes[0].getTextContent());
      } else {
        const index = removeTextAndSplitBlock(this);
        firstBlock.splice(index, 0, nodes);
        last.selectEnd();
      }
      return;
    }

    // CASE 2: All elements of the array are inline
    const notInline = (node: LexicalNode) =>
      ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();

    if (!nodes.some(notInline)) {
      invariant(
        $isElementNode(firstBlock),
        "Expected 'firstBlock' to be an ElementNode",
      );
      const index = removeTextAndSplitBlock(this);
      firstBlock.splice(index, 0, nodes);
      last.selectEnd();
      return;
    }

    // CASE 3: At least 1 element of the array is not inline
    const blocksParent = $wrapInlineNodes(nodes);
    const nodeToSelect = blocksParent.getLastDescendant()!;
    const blocks = blocksParent.getChildren();
    const isLI = (node: LexicalNode) =>
      '__value' in node && '__checked' in node;
    const isMergeable = (node: LexicalNode): node is ElementNode =>
      $isElementNode(node) &&
      INTERNAL_$isBlock(node) &&
      !node.isEmpty() &&
      $isElementNode(firstBlock) &&
      (!firstBlock.isEmpty() || isLI(firstBlock));

    const shouldInsert = !$isElementNode(firstBlock) || !firstBlock.isEmpty();
    const insertedParagraph = shouldInsert ? this.insertParagraph() : null;
    const lastToInsert = blocks[blocks.length - 1];
    let firstToInsert = blocks[0];
    if (isMergeable(firstToInsert)) {
      invariant(
        $isElementNode(firstBlock),
        "Expected 'firstBlock' to be an ElementNode",
      );
      firstBlock.append(...firstToInsert.getChildren());
      firstToInsert = blocks[1];
    }
    if (firstToInsert) {
      insertRangeAfter(firstBlock, firstToInsert);
    }
    const lastInsertedBlock = $getAncestor(nodeToSelect, INTERNAL_$isBlock)!;

    if (
      insertedParagraph &&
      $isElementNode(lastInsertedBlock) &&
      (isLI(insertedParagraph) || INTERNAL_$isBlock(lastToInsert))
    ) {
      lastInsertedBlock.append(...insertedParagraph.getChildren());
      insertedParagraph.remove();
    }
    if ($isElementNode(firstBlock) && firstBlock.isEmpty()) {
      firstBlock.remove();
    }

    nodeToSelect.selectEnd();

    // To understand this take a look at the test "can wrap post-linebreak nodes into new element"
    const lastChild = $isElementNode(firstBlock)
      ? firstBlock.getLastChild()
      : null;
    if ($isLineBreakNode(lastChild) && lastInsertedBlock !== firstBlock) {
      lastChild.remove();
    }
  }

  /**
   * Inserts a new ParagraphNode into the EditorState at the current Selection
   *
   * @returns the newly inserted node.
   */
  insertParagraph(): ElementNode | null {
    if (this.anchor.key === 'root') {
      const paragraph = $createParagraphNode();
      $getRoot().splice(this.anchor.offset, 0, [paragraph]);
      paragraph.select();
      return paragraph;
    }
    const index = removeTextAndSplitBlock(this);
    const block = $getAncestor(this.anchor.getNode(), INTERNAL_$isBlock)!;
    invariant($isElementNode(block), 'Expected ancestor to be an ElementNode');
    const firstToAppend = block.getChildAtIndex(index);
    const nodesToInsert = firstToAppend
      ? [firstToAppend, ...firstToAppend.getNextSiblings()]
      : [];
    const newBlock = block.insertNewAfter(this, false) as ElementNode | null;
    if (newBlock) {
      newBlock.append(...nodesToInsert);
      newBlock.selectStart();
      return newBlock;
    }
    // if newBlock is null, it means that block is of type CodeNode.
    return null;
  }

  /**
   * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
   * current Selection.
   */
  insertLineBreak(selectStart?: boolean): void {
    const lineBreak = $createLineBreakNode();
    this.insertNodes([lineBreak]);
    // this is used in MacOS with the command 'ctrl-O' (openLineBreak)
    if (selectStart) {
      const parent = lineBreak.getParentOrThrow();
      const index = lineBreak.getIndexWithinParent();
      parent.select(index, index);
    }
  }

  /**
   * Extracts the nodes in the Selection, splitting nodes where necessary
   * to get offset-level precision.
   *
   * @returns The nodes in the Selection
   */
  extract(): Array<LexicalNode> {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];
    const [anchorOffset, focusOffset] = $getCharacterOffsets(this);

    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode) && !this.isCollapsed()) {
        const startOffset =
          anchorOffset > focusOffset ? focusOffset : anchorOffset;
        const endOffset =
          anchorOffset > focusOffset ? anchorOffset : focusOffset;
        const splitNodes = firstNode.splitText(startOffset, endOffset);
        const node = startOffset === 0 ? splitNodes[0] : splitNodes[1];
        return node != null ? [node] : [];
      }
      return [firstNode];
    }
    const isBefore = anchor.isBefore(focus);

    if ($isTextNode(firstNode)) {
      const startOffset = isBefore ? anchorOffset : focusOffset;
      if (startOffset === firstNode.getTextContentSize()) {
        selectedNodes.shift();
      } else if (startOffset !== 0) {
        [, firstNode] = firstNode.splitText(startOffset);
        selectedNodes[0] = firstNode;
      }
    }
    if ($isTextNode(lastNode)) {
      const lastNodeText = lastNode.getTextContent();
      const lastNodeTextLength = lastNodeText.length;
      const endOffset = isBefore ? focusOffset : anchorOffset;
      if (endOffset === 0) {
        selectedNodes.pop();
      } else if (endOffset !== lastNodeTextLength) {
        [lastNode] = lastNode.splitText(endOffset);
        selectedNodes[lastIndex] = lastNode;
      }
    }
    return selectedNodes;
  }

  /**
   * Modifies the Selection according to the parameters and a set of heuristics that account for
   * various node types. Can be used to safely move or extend selection by one logical "unit" without
   * dealing explicitly with all the possible node types.
   *
   * @param alter the type of modification to perform
   * @param isBackward whether or not selection is backwards
   * @param granularity the granularity at which to apply the modification
   */
  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void {
    const focus = this.focus;
    const anchor = this.anchor;
    const collapse = alter === 'move';

    // Handle the selection movement around decorators.
    const possibleNode = $getAdjacentNode(focus, isBackward);
    if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
      // Make it possible to move selection from range selection to
      // node selection on the node.
      if (collapse && possibleNode.isKeyboardSelectable()) {
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(possibleNode.__key);
        $setSelection(nodeSelection);
        return;
      }
      const sibling = isBackward
        ? possibleNode.getPreviousSibling()
        : possibleNode.getNextSibling();

      if (!$isTextNode(sibling)) {
        const parent = possibleNode.getParentOrThrow();
        let offset;
        let elementKey;

        if ($isElementNode(sibling)) {
          elementKey = sibling.__key;
          offset = isBackward ? sibling.getChildrenSize() : 0;
        } else {
          offset = possibleNode.getIndexWithinParent();
          elementKey = parent.__key;
          if (!isBackward) {
            offset++;
          }
        }
        focus.set(elementKey, offset, 'element');
        if (collapse) {
          anchor.set(elementKey, offset, 'element');
        }
        return;
      } else {
        const siblingKey = sibling.__key;
        const offset = isBackward ? sibling.getTextContent().length : 0;
        focus.set(siblingKey, offset, 'text');
        if (collapse) {
          anchor.set(siblingKey, offset, 'text');
        }
        return;
      }
    }
    const editor = getActiveEditor();
    const domSelection = getDOMSelection(editor._window);

    if (!domSelection) {
      return;
    }
    const blockCursorElement = editor._blockCursorElement;
    const rootElement = editor._rootElement;
    // Remove the block cursor element if it exists. This will ensure selection
    // works as intended. If we leave it in the DOM all sorts of strange bugs
    // occur. :/
    if (
      rootElement !== null &&
      blockCursorElement !== null &&
      $isElementNode(possibleNode) &&
      !possibleNode.isInline() &&
      !possibleNode.canBeEmpty()
    ) {
      removeDOMBlockCursorElement(blockCursorElement, editor, rootElement);
    }
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    moveNativeSelection(
      domSelection,
      alter,
      isBackward ? 'backward' : 'forward',
      granularity,
    );
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      const anchorNode = this.anchor.getNode();
      const root = $isRootNode(anchorNode)
        ? anchorNode
        : $getNearestRootOrShadowRoot(anchorNode);
      this.applyDOMRange(range);
      this.dirty = true;
      if (!collapse) {
        // Validate selection; make sure that the new extended selection respects shadow roots
        const nodes = this.getNodes();
        const validNodes = [];
        let shrinkSelection = false;
        for (let i = 0; i < nodes.length; i++) {
          const nextNode = nodes[i];
          if ($hasAncestor(nextNode, root)) {
            validNodes.push(nextNode);
          } else {
            shrinkSelection = true;
          }
        }
        if (shrinkSelection && validNodes.length > 0) {
          // validNodes length check is a safeguard against an invalid selection; as getNodes()
          // will return an empty array in this case
          if (isBackward) {
            const firstValidNode = validNodes[0];
            if ($isElementNode(firstValidNode)) {
              firstValidNode.selectStart();
            } else {
              firstValidNode.getParentOrThrow().selectStart();
            }
          } else {
            const lastValidNode = validNodes[validNodes.length - 1];
            if ($isElementNode(lastValidNode)) {
              lastValidNode.selectEnd();
            } else {
              lastValidNode.getParentOrThrow().selectEnd();
            }
          }
        }

        // Because a range works on start and end, we might need to flip
        // the anchor and focus points to match what the DOM has, not what
        // the range has specifically.
        if (
          domSelection.anchorNode !== range.startContainer ||
          domSelection.anchorOffset !== range.startOffset
        ) {
          $swapPoints(this);
        }
      }
    }
  }
  /**
   * Helper for handling forward character and word deletion that prevents element nodes
   * like a table, columns layout being destroyed
   *
   * @param anchor the anchor
   * @param anchorNode the anchor node in the selection
   * @param isBackward whether or not selection is backwards
   */
  forwardDeletion(
    anchor: PointType,
    anchorNode: TextNode | ElementNode,
    isBackward: boolean,
  ): boolean {
    if (
      !isBackward &&
      // Delete forward handle case
      ((anchor.type === 'element' &&
        $isElementNode(anchorNode) &&
        anchor.offset === anchorNode.getChildrenSize()) ||
        (anchor.type === 'text' &&
          anchor.offset === anchorNode.getTextContentSize()))
    ) {
      const parent = anchorNode.getParent();
      const nextSibling =
        anchorNode.getNextSibling() ||
        (parent === null ? null : parent.getNextSibling());

      if ($isElementNode(nextSibling) && nextSibling.isShadowRoot()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Performs one logical character deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteCharacter(isBackward: boolean): void {
    const wasCollapsed = this.isCollapsed();
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      let anchorNode: TextNode | ElementNode | null = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) {
        return;
      }

      // Handle the deletion around decorators.
      const focus = this.focus;
      const possibleNode = $getAdjacentNode(focus, isBackward);
      if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
        // Make it possible to move selection from range selection to
        // node selection on the node.
        if (
          possibleNode.isKeyboardSelectable() &&
          $isElementNode(anchorNode) &&
          anchorNode.getChildrenSize() === 0
        ) {
          anchorNode.remove();
          const nodeSelection = $createNodeSelection();
          nodeSelection.add(possibleNode.__key);
          $setSelection(nodeSelection);
        } else {
          possibleNode.remove();
          const editor = getActiveEditor();
          editor.dispatchCommand(SELECTION_CHANGE_COMMAND, undefined);
        }
        return;
      } else if (
        !isBackward &&
        $isElementNode(possibleNode) &&
        $isElementNode(anchorNode) &&
        anchorNode.isEmpty()
      ) {
        anchorNode.remove();
        possibleNode.selectStart();
        return;
      }
      this.modify('extend', isBackward, 'character');

      if (!this.isCollapsed()) {
        const focusNode = focus.type === 'text' ? focus.getNode() : null;
        anchorNode = anchor.type === 'text' ? anchor.getNode() : null;

        if (focusNode !== null && focusNode.isSegmented()) {
          const offset = focus.offset;
          const textContentSize = focusNode.getTextContentSize();
          if (
            focusNode.is(anchorNode) ||
            (isBackward && offset !== textContentSize) ||
            (!isBackward && offset !== 0)
          ) {
            $removeSegment(focusNode, isBackward, offset);
            return;
          }
        } else if (anchorNode !== null && anchorNode.isSegmented()) {
          const offset = anchor.offset;
          const textContentSize = anchorNode.getTextContentSize();
          if (
            anchorNode.is(focusNode) ||
            (isBackward && offset !== 0) ||
            (!isBackward && offset !== textContentSize)
          ) {
            $removeSegment(anchorNode, isBackward, offset);
            return;
          }
        }
        $updateCaretSelectionForUnicodeCharacter(this, isBackward);
      } else if (isBackward && anchor.offset === 0) {
        // Special handling around rich text nodes
        const element =
          anchor.type === 'element'
            ? anchor.getNode()
            : anchor.getNode().getParentOrThrow();
        if (element.collapseAtStart(this)) {
          return;
        }
      }
    }
    this.removeText();
    if (
      isBackward &&
      !wasCollapsed &&
      this.isCollapsed() &&
      this.anchor.type === 'element' &&
      this.anchor.offset === 0
    ) {
      const anchorNode = this.anchor.getNode();
      if (
        anchorNode.isEmpty() &&
        $isRootNode(anchorNode.getParent()) &&
        anchorNode.getIndexWithinParent() === 0
      ) {
        anchorNode.collapseAtStart(this);
      }
    }
  }

  /**
   * Performs one logical line deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteLine(isBackward: boolean): void {
    if (this.isCollapsed()) {
      if (this.anchor.type === 'text') {
        this.modify('extend', isBackward, 'lineboundary');
      }

      // If selection is extended to cover text edge then extend it one character more
      // to delete its parent element. Otherwise text content will be deleted but empty
      // parent node will remain
      const endPoint = isBackward ? this.focus : this.anchor;
      if (endPoint.offset === 0) {
        this.modify('extend', isBackward, 'character');
      }
    }
    this.removeText();
  }

  /**
   * Performs one logical word deletion operation on the EditorState based on the current Selection.
   * Handles different node types.
   *
   * @param isBackward whether or not the selection is backwards.
   */
  deleteWord(isBackward: boolean): void {
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const anchorNode: TextNode | ElementNode | null = anchor.getNode();
      if (this.forwardDeletion(anchor, anchorNode, isBackward)) return;
      this.modify('extend', isBackward, 'word');
    }
    this.removeText();
  }

  /**
   * Returns whether the Selection is "backwards", meaning the focus
   * logically precedes the anchor in the EditorState.
   * @returns true if the Selection is backwards, false otherwise.
   */
  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  getStartEndPoints(): null | [PointType, PointType] {
    return [this.anchor, this.focus];
  }
}

export function $isNodeSelection(x: unknown): x is NodeSelection {
  return x instanceof NodeSelection;
}

function getCharacterOffset(point: PointType): number {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }

  const parent = point.getNode();
  return offset === parent.getChildrenSize()
    ? parent.getTextContent().length
    : 0;
}

export function $getCharacterOffsets(
  selection: BaseSelection,
): [number, number] {
  const anchorAndFocus = selection.getStartEndPoints();
  if (anchorAndFocus === null) {
    return [0, 0];
  }
  const [anchor, focus] = anchorAndFocus;
  if (
    anchor.type === 'element' &&
    focus.type === 'element' &&
    anchor.key === focus.key &&
    anchor.offset === focus.offset
  ) {
    return [0, 0];
  }
  return [getCharacterOffset(anchor), getCharacterOffset(focus)];
}

function $swapPoints(selection: RangeSelection): void {
  const focus = selection.focus;
  const anchor = selection.anchor;
  const anchorKey = anchor.key;
  const anchorOffset = anchor.offset;
  const anchorType = anchor.type;

  $setPointValues(anchor, focus.key, focus.offset, focus.type);
  $setPointValues(focus, anchorKey, anchorOffset, anchorType);
  selection._cachedNodes = null;
}

function moveNativeSelection(
  domSelection: Selection,
  alter: 'move' | 'extend',
  direction: 'backward' | 'forward' | 'left' | 'right',
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  // Selection.modify() method applies a change to the current selection or cursor position,
  // but is still non-standard in some browsers.
  domSelection.modify(alter, direction, granularity);
}

function $updateCaretSelectionForUnicodeCharacter(
  selection: RangeSelection,
  isBackward: boolean,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();

  if (
    anchorNode === focusNode &&
    anchor.type === 'text' &&
    focus.type === 'text'
  ) {
    // Handling of multibyte characters
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    const isBefore = anchorOffset < focusOffset;
    const startOffset = isBefore ? anchorOffset : focusOffset;
    const endOffset = isBefore ? focusOffset : anchorOffset;
    const characterOffset = endOffset - 1;

    if (startOffset !== characterOffset) {
      const text = anchorNode.getTextContent().slice(startOffset, endOffset);
      if (!doesContainGrapheme(text)) {
        if (isBackward) {
          focus.offset = characterOffset;
        } else {
          anchor.offset = characterOffset;
        }
      }
    }
  } else {
    // TODO Handling of multibyte characters
  }
}

function $removeSegment(
  node: TextNode,
  isBackward: boolean,
  offset: number,
): void {
  const textNode = node;
  const textContent = textNode.getTextContent();
  const split = textContent.split(/(?=\s)/g);
  const splitLength = split.length;
  let segmentOffset = 0;
  let restoreOffset: number | undefined = 0;

  for (let i = 0; i < splitLength; i++) {
    const text = split[i];
    const isLast = i === splitLength - 1;
    restoreOffset = segmentOffset;
    segmentOffset += text.length;

    if (
      (isBackward && segmentOffset === offset) ||
      segmentOffset > offset ||
      isLast
    ) {
      split.splice(i, 1);
      if (isLast) {
        restoreOffset = undefined;
      }
      break;
    }
  }
  const nextTextContent = split.join('').trim();

  if (nextTextContent === '') {
    textNode.remove();
  } else {
    textNode.setTextContent(nextTextContent);
    textNode.select(restoreOffset, restoreOffset);
  }
}

function shouldResolveAncestor(
  resolvedElement: ElementNode,
  resolvedOffset: number,
  lastPoint: null | PointType,
): boolean {
  const parent = resolvedElement.getParent();
  return (
    lastPoint === null ||
    parent === null ||
    !parent.canBeEmpty() ||
    parent !== lastPoint.getNode()
  );
}

function internalResolveSelectionPoint(
  dom: Node,
  offset: number,
  lastPoint: null | PointType,
  editor: LexicalEditor,
): null | PointType {
  let resolvedOffset = offset;
  let resolvedNode: TextNode | LexicalNode | null;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (dom.nodeType === DOM_ELEMENT_TYPE) {
    // Resolve element to a ElementNode, or TextNode, or null
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = dom.childNodes;
    const childNodesLength = childNodes.length;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    let childDOM = childNodes[resolvedOffset];
    let hasBlockCursor = false;
    if (childDOM === editor._blockCursorElement) {
      childDOM = childNodes[resolvedOffset + 1];
      hasBlockCursor = true;
    } else if (editor._blockCursorElement !== null) {
      resolvedOffset--;
    }
    resolvedNode = getNodeFromDOM(childDOM);

    if ($isTextNode(resolvedNode)) {
      resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
    } else {
      let resolvedElement = getNodeFromDOM(dom);
      // Ensure resolvedElement is actually a element.
      if (resolvedElement === null) {
        return null;
      }
      if ($isElementNode(resolvedElement)) {
        let child = resolvedElement.getChildAtIndex(resolvedOffset);
        if (
          $isElementNode(child) &&
          shouldResolveAncestor(child, resolvedOffset, lastPoint)
        ) {
          const descendant = moveSelectionToEnd
            ? child.getLastDescendant()
            : child.getFirstDescendant();
          if (descendant === null) {
            resolvedElement = child;
            resolvedOffset = 0;
          } else {
            child = descendant;
            resolvedElement = $isElementNode(child)
              ? child
              : child.getParentOrThrow();
          }
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = getTextNodeOffset(child, moveSelectionToEnd);
        } else if (
          child !== resolvedElement &&
          moveSelectionToEnd &&
          !hasBlockCursor
        ) {
          resolvedOffset++;
        }
      } else {
        const index = resolvedElement.getIndexWithinParent();
        // When selecting decorators, there can be some selection issues when using resolvedOffset,
        // and instead we should be checking if we're using the offset
        if (
          offset === 0 &&
          $isDecoratorNode(resolvedElement) &&
          getNodeFromDOM(dom) === resolvedElement
        ) {
          resolvedOffset = index;
        } else {
          resolvedOffset = index + 1;
        }
        resolvedElement = resolvedElement.getParentOrThrow();
      }
      if ($isElementNode(resolvedElement)) {
        return $createPoint(resolvedElement.__key, resolvedOffset, 'element');
      }
    }
  } else {
    // TextNode or null
    resolvedNode = getNodeFromDOM(dom);
  }
  if (!$isTextNode(resolvedNode)) {
    return null;
  }
  return $createPoint(resolvedNode.__key, resolvedOffset, 'text');
}

function resolveSelectionPointOnBoundary(
  point: TextPointType,
  isBackward: boolean,
  isCollapsed: boolean,
): void {
  const offset = point.offset;
  const node = point.getNode();

  if (offset === 0) {
    const prevSibling = node.getPreviousSibling();
    const parent = node.getParent();

    if (!isBackward) {
      if (
        $isElementNode(prevSibling) &&
        !isCollapsed &&
        prevSibling.isInline()
      ) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getChildrenSize();
        // @ts-expect-error: intentional
        point.type = 'element';
      } else if ($isTextNode(prevSibling)) {
        point.key = prevSibling.__key;
        point.offset = prevSibling.getTextContent().length;
      }
    } else if (
      (isCollapsed || !isBackward) &&
      prevSibling === null &&
      $isElementNode(parent) &&
      parent.isInline()
    ) {
      const parentSibling = parent.getPreviousSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = parentSibling.getTextContent().length;
      }
    }
  } else if (offset === node.getTextContent().length) {
    const nextSibling = node.getNextSibling();
    const parent = node.getParent();

    if (isBackward && $isElementNode(nextSibling) && nextSibling.isInline()) {
      point.key = nextSibling.__key;
      point.offset = 0;
      // @ts-expect-error: intentional
      point.type = 'element';
    } else if (
      (isCollapsed || isBackward) &&
      nextSibling === null &&
      $isElementNode(parent) &&
      parent.isInline() &&
      !parent.canInsertTextAfter()
    ) {
      const parentSibling = parent.getNextSibling();
      if ($isTextNode(parentSibling)) {
        point.key = parentSibling.__key;
        point.offset = 0;
      }
    }
  }
}

function normalizeSelectionPointsForBoundaries(
  anchor: PointType,
  focus: PointType,
  lastSelection: null | BaseSelection,
): void {
  if (anchor.type === 'text' && focus.type === 'text') {
    const isBackward = anchor.isBefore(focus);
    const isCollapsed = anchor.is(focus);

    // Attempt to normalize the offset to the previous sibling if we're at the
    // start of a text node and the sibling is a text node or inline element.
    resolveSelectionPointOnBoundary(anchor, isBackward, isCollapsed);
    resolveSelectionPointOnBoundary(focus, !isBackward, isCollapsed);

    if (isCollapsed) {
      focus.key = anchor.key;
      focus.offset = anchor.offset;
      focus.type = anchor.type;
    }
    const editor = getActiveEditor();

    if (
      editor.isComposing() &&
      editor._compositionKey !== anchor.key &&
      $isRangeSelection(lastSelection)
    ) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      $setPointValues(
        anchor,
        lastAnchor.key,
        lastAnchor.offset,
        lastAnchor.type,
      );
      $setPointValues(focus, lastFocus.key, lastFocus.offset, lastFocus.type);
    }
  }
}

function internalResolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: LexicalEditor,
  lastSelection: null | BaseSelection,
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolvedAnchorPoint = internalResolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    $isRangeSelection(lastSelection) ? lastSelection.anchor : null,
    editor,
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
    editor,
  );
  if (resolvedFocusPoint === null) {
    return null;
  }
  if (
    resolvedAnchorPoint.type === 'element' &&
    resolvedFocusPoint.type === 'element'
  ) {
    const anchorNode = getNodeFromDOM(anchorDOM);
    const focusNode = getNodeFromDOM(focusDOM);
    // Ensure if we're selecting the content of a decorator that we
    // return null for this point, as it's not in the controlled scope
    // of Lexical.
    if ($isDecoratorNode(anchorNode) && $isDecoratorNode(focusNode)) {
      return null;
    }
  }

  // Handle normalization of selection when it is at the boundaries.
  normalizeSelectionPointsForBoundaries(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection,
  );

  return [resolvedAnchorPoint, resolvedFocusPoint];
}

export function $isBlockElementNode(
  node: LexicalNode | null | undefined,
): node is ElementNode {
  return $isElementNode(node) && !node.isInline();
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.

export function internalMakeRangeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
  anchorType: 'text' | 'element',
  focusType: 'text' | 'element',
): RangeSelection {
  const editorState = getActiveEditorState();
  const selection = new RangeSelection(
    $createPoint(anchorKey, anchorOffset, anchorType),
    $createPoint(focusKey, focusOffset, focusType),
    0,
    '',
  );
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}

export function $createRangeSelection(): RangeSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0, '');
}

export function $createNodeSelection(): NodeSelection {
  return new NodeSelection(new Set());
}

export function internalCreateSelection(
  editor: LexicalEditor,
): null | BaseSelection {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection(editor._window);

  if ($isRangeSelection(lastSelection) || lastSelection == null) {
    return internalCreateRangeSelection(
      lastSelection,
      domSelection,
      editor,
      null,
    );
  }
  return lastSelection.clone();
}

export function internalCreateRangeSelection(
  lastSelection: null | BaseSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
  event: UIEvent | Event | null,
): null | RangeSelection {
  const windowObj = editor._window;
  if (windowObj === null) {
    return null;
  }
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the editor state for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const windowEvent = event || windowObj.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    !getIsProcessingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' &&
        windowEvent &&
        (windowEvent as InputEvent).detail === 3) ||
      eventType === 'drop' ||
      eventType === undefined);
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (!$isRangeSelection(lastSelection) || useDOMSelection) {
    if (domSelection === null) {
      return null;
    }
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
    if (
      isSelectionChange &&
      $isRangeSelection(lastSelection) &&
      !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
    ) {
      return lastSelection.clone();
    }
  } else {
    return lastSelection.clone();
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = internalResolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
    lastSelection,
  );
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;
  return new RangeSelection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    !$isRangeSelection(lastSelection) ? 0 : lastSelection.format,
    !$isRangeSelection(lastSelection) ? '' : lastSelection.style,
  );
}

export function $getSelection(): null | BaseSelection {
  const editorState = getActiveEditorState();
  return editorState._selection;
}

export function $getPreviousSelection(): null | BaseSelection {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}

export function $updateElementSelectionOnCreateDeleteNode(
  selection: RangeSelection,
  parentNode: LexicalNode,
  nodeOffset: number,
  times = 1,
): void {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (!parentNode.is(anchorNode) && !parentNode.is(focusNode)) {
    return;
  }
  const parentKey = parentNode.__key;
  // Single node. We shift selection but never redimension it
  if (selection.isCollapsed()) {
    const selectionOffset = anchor.offset;
    if (
      (nodeOffset <= selectionOffset && times > 0) ||
      (nodeOffset < selectionOffset && times < 0)
    ) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
  } else {
    // Multiple nodes selected. We shift or redimension selection
    const isBackward = selection.isBackward();
    const firstPoint = isBackward ? focus : anchor;
    const firstPointNode = firstPoint.getNode();
    const lastPoint = isBackward ? anchor : focus;
    const lastPointNode = lastPoint.getNode();
    if (parentNode.is(firstPointNode)) {
      const firstPointOffset = firstPoint.offset;
      if (
        (nodeOffset <= firstPointOffset && times > 0) ||
        (nodeOffset < firstPointOffset && times < 0)
      ) {
        firstPoint.set(
          parentKey,
          Math.max(0, firstPointOffset + times),
          'element',
        );
      }
    }
    if (parentNode.is(lastPointNode)) {
      const lastPointOffset = lastPoint.offset;
      if (
        (nodeOffset <= lastPointOffset && times > 0) ||
        (nodeOffset < lastPointOffset && times < 0)
      ) {
        lastPoint.set(
          parentKey,
          Math.max(0, lastPointOffset + times),
          'element',
        );
      }
    }
  }
  // The new selection might point to text nodes, try to resolve them
  $updateSelectionResolveTextNodes(selection);
}

function $updateSelectionResolveTextNodes(selection: RangeSelection): void {
  const anchor = selection.anchor;
  const anchorOffset = anchor.offset;
  const focus = selection.focus;
  const focusOffset = focus.offset;
  const anchorNode = anchor.getNode();
  const focusNode = focus.getNode();
  if (selection.isCollapsed()) {
    if (!$isElementNode(anchorNode)) {
      return;
    }
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
      focus.set(child.__key, newOffset, 'text');
    }
    return;
  }
  if ($isElementNode(anchorNode)) {
    const childSize = anchorNode.getChildrenSize();
    const anchorOffsetAtEnd = anchorOffset >= childSize;
    const child = anchorOffsetAtEnd
      ? anchorNode.getChildAtIndex(childSize - 1)
      : anchorNode.getChildAtIndex(anchorOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (anchorOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      anchor.set(child.__key, newOffset, 'text');
    }
  }
  if ($isElementNode(focusNode)) {
    const childSize = focusNode.getChildrenSize();
    const focusOffsetAtEnd = focusOffset >= childSize;
    const child = focusOffsetAtEnd
      ? focusNode.getChildAtIndex(childSize - 1)
      : focusNode.getChildAtIndex(focusOffset);
    if ($isTextNode(child)) {
      let newOffset = 0;
      if (focusOffsetAtEnd) {
        newOffset = child.getTextContentSize();
      }
      focus.set(child.__key, newOffset, 'text');
    }
  }
}

export function applySelectionTransforms(
  nextEditorState: EditorState,
  editor: LexicalEditor,
): void {
  const prevEditorState = editor.getEditorState();
  const prevSelection = prevEditorState._selection;
  const nextSelection = nextEditorState._selection;
  if ($isRangeSelection(nextSelection)) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;

    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}

export function moveSelectionPointToSibling(
  point: PointType,
  node: LexicalNode,
  parent: ElementNode,
  prevSibling: LexicalNode | null,
  nextSibling: LexicalNode | null,
): void {
  let siblingKey = null;
  let offset = 0;
  let type: 'text' | 'element' | null = null;
  if (prevSibling !== null) {
    siblingKey = prevSibling.__key;
    if ($isTextNode(prevSibling)) {
      offset = prevSibling.getTextContentSize();
      type = 'text';
    } else if ($isElementNode(prevSibling)) {
      offset = prevSibling.getChildrenSize();
      type = 'element';
    }
  } else {
    if (nextSibling !== null) {
      siblingKey = nextSibling.__key;
      if ($isTextNode(nextSibling)) {
        type = 'text';
      } else if ($isElementNode(nextSibling)) {
        type = 'element';
      }
    }
  }
  if (siblingKey !== null && type !== null) {
    point.set(siblingKey, offset, type);
  } else {
    offset = node.getIndexWithinParent();
    if (offset === -1) {
      // Move selection to end of parent
      offset = parent.getChildrenSize();
    }
    point.set(parent.__key, offset, 'element');
  }
}

export function adjustPointOffsetForMergedSibling(
  point: PointType,
  isBefore: boolean,
  key: NodeKey,
  target: TextNode,
  textLength: number,
): void {
  if (point.type === 'text') {
    point.key = key;
    if (!isBefore) {
      point.offset += textLength;
    }
  } else if (point.offset > target.getIndexWithinParent()) {
    point.offset -= 1;
  }
}

export function updateDOMSelection(
  prevSelection: BaseSelection | null,
  nextSelection: BaseSelection | null,
  editor: LexicalEditor,
  domSelection: Selection,
  tags: Set<string>,
  rootElement: HTMLElement,
  nodeCount: number,
): void {
  const anchorDOMNode = domSelection.anchorNode;
  const focusDOMNode = domSelection.focusNode;
  const anchorOffset = domSelection.anchorOffset;
  const focusOffset = domSelection.focusOffset;
  const activeElement = document.activeElement;

  // TODO: make this not hard-coded, and add another config option
  // that makes this configurable.
  if (
    (tags.has('collaboration') && activeElement !== rootElement) ||
    (activeElement !== null &&
      isSelectionCapturedInDecoratorInput(activeElement))
  ) {
    return;
  }

  if (!$isRangeSelection(nextSelection)) {
    // We don't remove selection if the prevSelection is null because
    // of editor.setRootElement(). If this occurs on init when the
    // editor is already focused, then this can cause the editor to
    // lose focus.
    if (
      prevSelection !== null &&
      isSelectionWithinEditor(editor, anchorDOMNode, focusDOMNode)
    ) {
      domSelection.removeAllRanges();
    }

    return;
  }

  const anchor = nextSelection.anchor;
  const focus = nextSelection.focus;
  const anchorKey = anchor.key;
  const focusKey = focus.key;
  const anchorDOM = getElementByKeyOrThrow(editor, anchorKey);
  const focusDOM = getElementByKeyOrThrow(editor, focusKey);
  const nextAnchorOffset = anchor.offset;
  const nextFocusOffset = focus.offset;
  const nextFormat = nextSelection.format;
  const nextStyle = nextSelection.style;
  const isCollapsed = nextSelection.isCollapsed();
  let nextAnchorNode: HTMLElement | Text | null = anchorDOM;
  let nextFocusNode: HTMLElement | Text | null = focusDOM;
  let anchorFormatOrStyleChanged = false;

  if (anchor.type === 'text') {
    nextAnchorNode = getDOMTextNode(anchorDOM);
    const anchorNode = anchor.getNode();
    anchorFormatOrStyleChanged =
      anchorNode.getFormat() !== nextFormat ||
      anchorNode.getStyle() !== nextStyle;
  } else if (
    $isRangeSelection(prevSelection) &&
    prevSelection.anchor.type === 'text'
  ) {
    anchorFormatOrStyleChanged = true;
  }

  if (focus.type === 'text') {
    nextFocusNode = getDOMTextNode(focusDOM);
  }

  // If we can't get an underlying text node for selection, then
  // we should avoid setting selection to something incorrect.
  if (nextAnchorNode === null || nextFocusNode === null) {
    return;
  }

  if (
    isCollapsed &&
    (prevSelection === null ||
      anchorFormatOrStyleChanged ||
      ($isRangeSelection(prevSelection) &&
        (prevSelection.format !== nextFormat ||
          prevSelection.style !== nextStyle)))
  ) {
    markCollapsedSelectionFormat(
      nextFormat,
      nextStyle,
      nextAnchorOffset,
      anchorKey,
      performance.now(),
    );
  }

  // Diff against the native DOM selection to ensure we don't do
  // an unnecessary selection update. We also skip this check if
  // we're moving selection to within an element, as this can
  // sometimes be problematic around scrolling.
  if (
    anchorOffset === nextAnchorOffset &&
    focusOffset === nextFocusOffset &&
    anchorDOMNode === nextAnchorNode &&
    focusDOMNode === nextFocusNode && // Badly interpreted range selection when collapsed - #1482
    !(domSelection.type === 'Range' && isCollapsed)
  ) {
    // If the root element does not have focus, ensure it has focus
    if (activeElement === null || !rootElement.contains(activeElement)) {
      rootElement.focus({
        preventScroll: true,
      });
    }
    if (anchor.type !== 'element') {
      return;
    }
  }

  // Apply the updated selection to the DOM. Note: this will trigger
  // a "selectionchange" event, although it will be asynchronous.
  try {
    domSelection.setBaseAndExtent(
      nextAnchorNode,
      nextAnchorOffset,
      nextFocusNode,
      nextFocusOffset,
    );
  } catch (error) {
    // If we encounter an error, continue. This can sometimes
    // occur with FF and there's no good reason as to why it
    // should happen.
  }
  if (
    !tags.has('skip-scroll-into-view') &&
    nextSelection.isCollapsed() &&
    rootElement !== null &&
    rootElement === document.activeElement
  ) {
    const selectionTarget: null | Range | HTMLElement | Text =
      nextSelection instanceof RangeSelection &&
      nextSelection.anchor.type === 'element'
        ? (nextAnchorNode.childNodes[nextAnchorOffset] as HTMLElement | Text) ||
          null
        : domSelection.rangeCount > 0
        ? domSelection.getRangeAt(0)
        : null;
    if (selectionTarget !== null) {
      let selectionRect: DOMRect;
      if (selectionTarget instanceof Text) {
        const range = document.createRange();
        range.selectNode(selectionTarget);
        selectionRect = range.getBoundingClientRect();
      } else {
        selectionRect = selectionTarget.getBoundingClientRect();
      }
      scrollIntoViewIfNeeded(editor, selectionRect, rootElement);
    }
  }

  markSelectionChangeFromDOMUpdate();
}

export function $insertNodes(nodes: Array<LexicalNode>) {
  let selection = $getSelection() || $getPreviousSelection();

  if (selection === null) {
    selection = $getRoot().selectEnd();
  }
  selection.insertNodes(nodes);
}

export function $getTextContent(): string {
  const selection = $getSelection();
  if (selection === null) {
    return '';
  }
  return selection.getTextContent();
}

function removeTextAndSplitBlock(selection: RangeSelection): number {
  if (!selection.isCollapsed()) {
    selection.removeText();
  }

  const anchor = selection.anchor;
  let node = anchor.getNode();
  let offset = anchor.offset;

  while (!INTERNAL_$isBlock(node)) {
    [node, offset] = splitNodeAtPoint(node, offset);
  }

  return offset;
}

function splitNodeAtPoint(
  node: LexicalNode,
  offset: number,
): [parent: ElementNode, offset: number] {
  const parent = node.getParent();
  if (!parent) {
    const paragraph = $createParagraphNode();
    $getRoot().append(paragraph);
    paragraph.select();
    return [$getRoot(), 0];
  }

  if ($isTextNode(node)) {
    const split = node.splitText(offset);
    if (split.length === 0) {
      return [parent, node.getIndexWithinParent()];
    }
    const x = offset === 0 ? 0 : 1;
    const index = split[0].getIndexWithinParent() + x;

    return [parent, index];
  }

  if (!$isElementNode(node) || offset === 0) {
    return [parent, node.getIndexWithinParent()];
  }

  const firstToAppend = node.getChildAtIndex(offset);
  if (firstToAppend) {
    const insertPoint = new RangeSelection(
      $createPoint(node.__key, offset, 'element'),
      $createPoint(node.__key, offset, 'element'),
      0,
      '',
    );
    const newElement = node.insertNewAfter(insertPoint) as ElementNode | null;
    if (newElement) {
      newElement.append(firstToAppend, ...firstToAppend.getNextSiblings());
    }
  }
  return [parent, node.getIndexWithinParent() + 1];
}

function $wrapInlineNodes(nodes: LexicalNode[]) {
  // We temporarily insert the topLevelNodes into an arbitrary ElementNode,
  // since insertAfter does not work on nodes that have no parent (TO-DO: fix that).
  const virtualRoot = $createParagraphNode();

  let currentBlock = null;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    const isLineBreakNode = $isLineBreakNode(node);

    if (
      isLineBreakNode ||
      ($isDecoratorNode(node) && node.isInline()) ||
      ($isElementNode(node) && node.isInline()) ||
      $isTextNode(node) ||
      node.isParentRequired()
    ) {
      if (currentBlock === null) {
        currentBlock = node.createParentElementNode();
        virtualRoot.append(currentBlock);
        // In the case of LineBreakNode, we just need to
        // add an empty ParagraphNode to the topLevelBlocks.
        if (isLineBreakNode) {
          continue;
        }
      }

      if (currentBlock !== null) {
        currentBlock.append(node);
      }
    } else {
      virtualRoot.append(node);
      currentBlock = null;
    }
  }

  return virtualRoot;
}
