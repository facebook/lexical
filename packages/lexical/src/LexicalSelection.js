/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {LexicalNode, NodeKey} from './LexicalNode';
import type {ParsedSelection} from './LexicalParsing';
import type {ElementNode} from './nodes/LexicalElementNode';
import type {TextFormatType} from './nodes/LexicalTextNode';

import getDOMSelection from 'shared/getDOMSelection';
import invariant from 'shared/invariant';

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isDecoratorNode,
  $isElementNode,
  $isGridCellNode,
  $isGridNode,
  $isGridRowNode,
  $isLeafNode,
  $isLineBreakNode,
  $isRootNode,
  $isTextNode,
  TextNode,
} from '.';
import {DOM_ELEMENT_TYPE, TEXT_TYPE_TO_FORMAT} from './LexicalConstants';
import {getIsProcesssingMutations} from './LexicalMutations';
import {
  getActiveEditor,
  getActiveEditorState,
  isCurrentlyReadOnlyMode,
} from './LexicalUpdates';
import {
  $getCompositionKey,
  $getDecoratorNode,
  $getNodeByKey,
  $isTokenOrInert,
  $isTokenOrInertOrSegmented,
  $setCompositionKey,
  doesContainGrapheme,
  getNodeFromDOM,
  getTextNodeOffset,
  isSelectionWithinEditor,
  toggleTextFormatType,
} from './LexicalUtils';

export type TextPointType = {
  _selection: RangeSelection | GridSelection,
  getNode: () => TextNode,
  is: (PointType) => boolean,
  isAtNodeEnd: () => boolean,
  isBefore: (PointType) => boolean,
  key: NodeKey,
  offset: number,
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void,
  type: 'text',
};

export type ElementPointType = {
  _selection: RangeSelection | GridSelection,
  getNode: () => ElementNode,
  is: (PointType) => boolean,
  isAtNodeEnd: () => boolean,
  isBefore: (PointType) => boolean,
  key: NodeKey,
  offset: number,
  set: (key: NodeKey, offset: number, type: 'text' | 'element') => void,
  type: 'element',
};

export type PointType = TextPointType | ElementPointType;

class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'element';
  _selection: RangeSelection | GridSelection;

  constructor(key: NodeKey, offset: number, type: 'text' | 'element'): void {
    // $FlowFixMe: is temporarily null
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
      const aNodeDescendant = aNode.getDescendantByIndex(aOffset);
      aNode = aNodeDescendant != null ? aNodeDescendant : aNode;
    }
    if ($isElementNode(bNode)) {
      const bNodeDescendant = bNode.getDescendantByIndex(bOffset);
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
      if (
        selection !== null &&
        (selection.anchor === this || selection.focus === this)
      ) {
        selection._cachedNodes = null;
        selection.dirty = true;
      }
    }
  }
}

function $createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // $FlowFixMe: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

function selectPointOnNode(point: PointType, node: LexicalNode): void {
  const key = node.__key;
  let offset = point.offset;
  let type = 'element';
  if ($isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
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
  } else if ($isTextNode(node)) {
    selectPointOnNode(point, node);
  }
}

function $transferStartingElementPointToTextPoint(
  start: ElementPointType,
  end: PointType,
  format: number,
) {
  const element = start.getNode();
  const placementNode = element.getChildAtIndex(start.offset);
  const textNode = $createTextNode();
  const target = $isRootNode(element)
    ? $createParagraphNode().append(textNode)
    : textNode;
  textNode.setFormat(format);
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
  // $FlowFixMe: internal utility function
  point.offset = offset;
  // $FlowFixMe: internal utility function
  point.type = type;
}

interface BaseSelection {
  clone(): BaseSelection;
  dirty: boolean;
  extract(): Array<LexicalNode>;
  getNodes(): Array<LexicalNode>;
  getTextContent(): string;
  insertRawText(text: string): void;
  is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
}

export class NodeSelection implements BaseSelection {
  _nodes: Set<NodeKey>;
  dirty: boolean;
  _cachedNodes: null | Array<LexicalNode>;

  constructor(objects: Set<NodeKey>) {
    this.dirty = false;
    this._nodes = objects;
    this._cachedNodes = null;
  }

  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!$isNodeSelection(selection)) {
      return false;
    }
    const a: Set<NodeKey> = this._nodes;
    const b: Set<NodeKey> = selection._nodes;
    return a.size === b.size && Array.from(a).every((key) => b.has(key));
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

export function $isRangeSelection(x: ?mixed): boolean %checks {
  return x instanceof RangeSelection;
}

export type GridSelectionShape = {
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
};

export class GridSelection implements BaseSelection {
  gridKey: NodeKey;
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  _cachedNodes: null | Array<LexicalNode>;

  constructor(gridKey: NodeKey, anchor: PointType, focus: PointType): void {
    this.gridKey = gridKey;
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }

  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!$isGridSelection(selection)) {
      return false;
    }
    return this.gridKey === selection.gridKey && this.anchor.is(this.focus);
  }

  set(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void {
    this.dirty = true;
    this.gridKey = gridKey;
    this.anchor.key = anchorCellKey;
    this.focus.key = focusCellKey;
    this._cachedNodes = null;
  }

  clone(): GridSelection {
    return new GridSelection(this.gridKey, this.anchor, this.focus);
  }

  isCollapsed(): boolean {
    return false;
  }

  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  getCharacterOffsets(): [number, number] {
    return getCharacterOffsets(this);
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

  getShape(): GridSelectionShape {
    const anchorCellNode = $getNodeByKey(this.anchor.key);
    invariant(anchorCellNode, 'getNodes: expected to find AnchorNode');
    const anchorCellNodeIndex = anchorCellNode.getIndexWithinParent();
    const anchorCelRoweIndex = anchorCellNode
      .getParentOrThrow()
      .getIndexWithinParent();

    const focusCellNode = $getNodeByKey(this.focus.key);
    invariant(focusCellNode, 'getNodes: expected to find FocusNode');
    const focusCellNodeIndex = focusCellNode.getIndexWithinParent();
    const focusCellRowIndex = focusCellNode
      .getParentOrThrow()
      .getIndexWithinParent();

    const startX = Math.min(anchorCellNodeIndex, focusCellNodeIndex);
    const stopX = Math.max(anchorCellNodeIndex, focusCellNodeIndex);

    const startY = Math.min(anchorCelRoweIndex, focusCellRowIndex);
    const stopY = Math.max(anchorCelRoweIndex, focusCellRowIndex);

    return {
      fromX: Math.min(startX, stopX),
      fromY: Math.min(startY, stopY),
      toX: Math.max(startX, stopX),
      toY: Math.max(startY, stopY),
    };
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const nodesSet = new Set();
    const {fromX, fromY, toX, toY} = this.getShape();

    const gridNode = $getNodeByKey(this.gridKey);
    if (!$isGridNode(gridNode)) {
      invariant(false, 'getNodes: expected to find GridNode');
    }
    nodesSet.add(gridNode);

    const gridRowNodes = gridNode.getChildren();
    for (let r = fromY; r <= toY; r++) {
      const gridRowNode = gridRowNodes[r];
      nodesSet.add(gridRowNode);

      if (!$isGridRowNode(gridRowNode)) {
        invariant(false, 'getNodes: expected to find GridRowNode');
      }
      const gridCellNodes = gridRowNode.getChildren();
      for (let c = fromX; c <= toX; c++) {
        const gridCellNode = gridCellNodes[c];
        if (!$isGridCellNode(gridCellNode)) {
          invariant(false, 'getNodes: expected to find GridCellNode');
        }
        nodesSet.add(gridCellNode);

        const children = gridCellNode.getChildren();

        while (children.length > 0) {
          const child = children.shift();
          nodesSet.add(child);
          if ($isElementNode(child)) {
            children.unshift(...child.getChildren());
          }
        }
      }
    }
    const nodes = Array.from(nodesSet);
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

export function $isGridSelection(x: ?mixed): boolean %checks {
  return x instanceof GridSelection;
}

export class RangeSelection implements BaseSelection {
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  format: number;
  _cachedNodes: null | Array<LexicalNode>;

  constructor(anchor: PointType, focus: PointType, format: number): void {
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this.format = format;
    this._cachedNodes = null;
    anchor._selection = this;
    focus._selection = this;
  }

  is(
    selection: null | RangeSelection | NodeSelection | GridSelection,
  ): boolean {
    if (!$isRangeSelection(selection)) {
      return false;
    }
    return (
      this.anchor.is(selection.anchor) &&
      this.focus.is(selection.focus) &&
      this.format === selection.format
    );
  }

  isBackward(): boolean {
    return this.focus.isBefore(this.anchor);
  }

  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }

  getNodes(): Array<LexicalNode> {
    const cachedNodes = this._cachedNodes;
    if (cachedNodes !== null) {
      return cachedNodes;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = anchor.getNode();
    let lastNode = focus.getNode();

    if ($isElementNode(firstNode)) {
      const firstNodeDescendant = firstNode.getDescendantByIndex(anchor.offset);
      firstNode = firstNodeDescendant != null ? firstNodeDescendant : firstNode;
    }
    if ($isElementNode(lastNode)) {
      const lastNodeDescendant = lastNode.getDescendantByIndex(focus.offset);
      lastNode = lastNodeDescendant != null ? lastNodeDescendant : lastNode;
    }

    let nodes;

    if (firstNode.is(lastNode)) {
      if (
        $isElementNode(firstNode) &&
        (firstNode.getChildrenSize() > 0 || firstNode.excludeFromCopy())
      ) {
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
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);
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
              text =
                anchorOffset < focusOffset
                  ? text.slice(anchorOffset, focusOffset)
                  : text.slice(focusOffset, anchorOffset);
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

  clone(): RangeSelection {
    const anchor = this.anchor;
    const focus = this.focus;
    const selection = new RangeSelection(
      $createPoint(anchor.key, anchor.offset, anchor.type),
      $createPoint(focus.key, focus.offset, focus.type),
      this.format,
    );
    return selection;
  }

  toggleFormat(format: TextFormatType): void {
    this.format = toggleTextFormatType(this.format, format, null);
    this.dirty = true;
  }

  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.format & formatFlag) !== 0;
  }

  insertRawText(text: string): void {
    const parts = text.split(/\r?\n/);
    if (parts.length === 1) {
      this.insertText(text);
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
      this.insertNodes(nodes);
    }
  }

  insertText(text: string): void {
    const anchor = this.anchor;
    const focus = this.focus;
    const isBefore = this.isCollapsed() || anchor.isBefore(focus);
    const format = this.format;

    if (isBefore && anchor.type === 'element') {
      $transferStartingElementPointToTextPoint(anchor, focus, format);
    } else if (!isBefore && focus.type === 'element') {
      $transferStartingElementPointToTextPoint(focus, anchor, format);
    }
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const firstPoint = isBefore ? anchor : focus;
    const endPoint = isBefore ? focus : anchor;
    const startOffset = firstPoint.offset;
    const endOffset = endPoint.offset;
    let firstNode: LexicalNode = selectedNodes[0];

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
        !firstNodeParent.canInsertTextAfter())
    ) {
      let nextSibling = firstNode.getNextSibling();
      if (
        !$isTextNode(nextSibling) ||
        $isTokenOrInertOrSegmented(nextSibling)
      ) {
        nextSibling = $createTextNode();
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
        !firstNodeParent.canInsertTextBefore())
    ) {
      let prevSibling = firstNode.getPreviousSibling();
      if (
        !$isTextNode(prevSibling) ||
        $isTokenOrInertOrSegmented(prevSibling)
      ) {
        prevSibling = $createTextNode();
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
      if ($isTokenOrInert(firstNode)) {
        const textNode = $createTextNode(text);
        textNode.select();
        firstNode.replace(textNode);
        return;
      }
      const firstNodeFormat = firstNode.getFormat();

      if (startOffset === endOffset && firstNodeFormat !== format) {
        if (firstNode.getTextContent() === '') {
          firstNode.setFormat(format);
        } else {
          const textNode = $createTextNode(text);
          textNode.setFormat(format);
          textNode.select();
          if (startOffset === 0) {
            firstNode.insertBefore(textNode);
          } else {
            const [targetNode] = firstNode.splitText(startOffset);
            targetNode.insertAfter(textNode);
          }
          // When composing, we need to adjust the anchor offset so that
          // we correctly replace that right range.
          if (textNode.isComposing() && this.anchor.type === 'text') {
            this.anchor.offset -= text.length;
          }
          return;
        }
      }
      const delCount = endOffset - startOffset;

      firstNode = firstNode.spliceText(startOffset, delCount, text, true);
      if (firstNode.getTextContent() === '') {
        firstNode.remove();
      } else if (firstNode.isComposing() && this.anchor.type === 'text') {
        // When composing, we need to adjust the anchor offset so that
        // we correctly replace that right range.
        this.anchor.offset -= text.length;
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
          !$isTokenOrInert(lastNode) &&
          endOffset !== lastNode.getTextContentSize()
        ) {
          if (lastNode.isSegmented()) {
            const textNode = $createTextNode(lastNode.getTextContent());
            lastNode.replace(textNode);
            lastNode = textNode;
          }
          lastNode = lastNode.spliceText(0, endOffset, '');
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
              insertionTarget.insertAfter(lastNodeChild);
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
        let parent = lastElement;
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
      if (!$isTokenOrInert(firstNode)) {
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

  removeText(): void {
    this.insertText('');
  }

  formatText(formatType: TextFormatType): void {
    // TODO I wonder if this methods use selection.extract() instead?
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];

    if (this.isCollapsed()) {
      this.toggleFormat(formatType);
      // When changing format, we should stop composition
      $setCompositionKey(null);
      return;
    }
    const anchor = this.anchor;
    const focus = this.focus;
    const focusOffset = focus.offset;
    let firstNextFormat = 0;
    let firstNodeTextLength = firstNode.getTextContent().length;

    for (let i = 0; i < selectedNodes.length; i++) {
      const selectedNode = selectedNodes[i];
      if ($isTextNode(selectedNode)) {
        firstNextFormat = selectedNode.getFormatFlags(formatType, null);
        break;
      }
    }
    let anchorOffset = anchor.offset;
    let startOffset;
    let endOffset;

    const isBefore = anchor.isBefore(focus);
    startOffset = isBefore ? anchorOffset : focusOffset;
    endOffset = isBefore ? focusOffset : anchorOffset;

    // This is the case where the user only selected the very end of the
    // first node so we don't want to include it in the formatting change.
    if (startOffset === firstNode.getTextContentSize()) {
      let nextSibling = firstNode.getNextSibling();

      if ($isElementNode(nextSibling) && nextSibling.isInline()) {
        nextSibling = nextSibling.getFirstChild();
      }

      if ($isTextNode(nextSibling)) {
        // we basically make the second node the firstNode, changing offsets accordingly
        anchorOffset = 0;
        startOffset = 0;
        firstNode = nextSibling;
        firstNodeTextLength = nextSibling.getTextContent().length;
        firstNextFormat = firstNode.getFormatFlags(formatType, null);
      }
    }

    // This is the case where we only selected a single node
    if (firstNode.is(lastNode)) {
      if ($isTextNode(firstNode)) {
        if (anchor.type === 'element' && focus.type === 'element') {
          firstNode.setFormat(firstNextFormat);
          firstNode.select(startOffset, endOffset);
          this.format = firstNextFormat;
          return;
        }
        startOffset = anchorOffset > focusOffset ? focusOffset : anchorOffset;
        endOffset = anchorOffset > focusOffset ? anchorOffset : focusOffset;

        // No actual text is selected, so do nothing.
        if (startOffset === endOffset) {
          return;
        }
        // The entire node is selected, so just format it
        if (startOffset === 0 && endOffset === firstNodeTextLength) {
          firstNode.setFormat(firstNextFormat);
          firstNode.select(startOffset, endOffset);
        } else {
          // ndoe is partially selected, so split it into two nodes
          // adnd style the selected one.
          const splitNodes = firstNode.splitText(startOffset, endOffset);
          const replacement = startOffset === 0 ? splitNodes[0] : splitNodes[1];
          replacement.setFormat(firstNextFormat);
          replacement.select(0, endOffset - startOffset);
        }
        this.format = firstNextFormat;
      }
      // multiple nodes selected.
    } else {
      if ($isTextNode(firstNode)) {
        if (startOffset !== 0) {
          // the entire first node isn't selected, so split it
          [, firstNode] = firstNode.splitText(startOffset);
          startOffset = 0;
        }
        firstNode.setFormat(firstNextFormat);
      }
      let lastNextFormat = firstNextFormat;

      if ($isTextNode(lastNode)) {
        lastNextFormat = lastNode.getFormatFlags(formatType, firstNextFormat);
        const lastNodeText = lastNode.getTextContent();
        const lastNodeTextLength = lastNodeText.length;
        // if the offset is 0, it means no actual characters are selected,
        // so we skip formatting the last node altogether.
        if (endOffset !== 0) {
          // if the entire last node isn't selected, split it
          if (endOffset !== lastNodeTextLength) {
            [lastNode] = lastNode.splitText(endOffset);
          }
          lastNode.setFormat(lastNextFormat);
        }
      }

      // deal with all the nodes in between
      for (let i = 1; i < lastIndex; i++) {
        const selectedNode = selectedNodes[i];
        const selectedNodeKey = selectedNode.__key;
        if (
          $isTextNode(selectedNode) &&
          selectedNodeKey !== firstNode.__key &&
          selectedNodeKey !== lastNode.__key &&
          !selectedNode.isToken()
        ) {
          const selectedNextFormat = selectedNode.getFormatFlags(
            formatType,
            lastNextFormat,
          );
          selectedNode.setFormat(selectedNextFormat);
        }
      }
    }
  }

  insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean {
    // If there is a range selected remove the text in it
    if (!this.isCollapsed()) {
      this.removeText();
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    const anchorNode = anchor.getNode();
    let target = anchorNode;

    if (anchor.type === 'element') {
      const element = anchor.getNode();
      const placementNode = element.getChildAtIndex(anchorOffset - 1);
      if (placementNode === null) {
        target = element;
      } else {
        target = placementNode;
      }
    }
    const siblings = [];

    // Get all remaining text node siblings in this element so we can
    // append them after the last node we're inserting.
    const nextSiblings = anchorNode.getNextSiblings();
    const topLevelElement = $isRootNode(anchorNode)
      ? null
      : anchorNode.getTopLevelElementOrThrow();

    if ($isTextNode(anchorNode)) {
      const textContent = anchorNode.getTextContent();
      const textContentLength = textContent.length;
      if (anchorOffset === 0 && textContentLength !== 0) {
        const prevSibling = anchorNode.getPreviousSibling();
        if (prevSibling !== null) {
          target = prevSibling;
        } else {
          target = anchorNode.getParentOrThrow();
        }
        siblings.push(anchorNode);
      } else if (anchorOffset === textContentLength) {
        target = anchorNode;
      } else if ($isTokenOrInert(anchorNode)) {
        // Do nothing if we're inside an immutable/inert node
        return false;
      } else {
        // If we started with a range selected grab the danglingText after the
        // end of the selection and put it on our siblings array so we can
        // append it after the last node we're inserting
        let danglingText;
        [target, danglingText] = anchorNode.splitText(anchorOffset);
        siblings.push(danglingText);
      }
    }
    const startingNode = target;

    siblings.push(...nextSiblings);

    const firstNode = nodes[0];
    let didReplaceOrMerge = false;
    let lastNodeInserted = null;

    // Time to insert the nodes!
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && !node.isInline()) {
        // -----
        // Heuristics for the replacment or merging of elements
        // -----

        // If we have an incoming element node as the first node, then we'll need
        // see if we can merge any descendant leaf nodes into our existing target.
        // We can do this by finding the first descendant in our node and then we can
        // pluck it and its parent (siblings included) out and insert them directly
        // into our target. We only do this for the first node, as we are only
        // interested in merging with the anchor, which is our target.
        //
        // If we apply either the replacement or merging heuristics, we need to be
        // careful that we're not trying to insert a non-element node into a root node,
        // so we check if the target's parent after this logic is the root node and if
        // so we trigger an invariant to ensure this problem is caught in development
        // and fixed accordingly.

        if (node.is(firstNode)) {
          if (
            $isElementNode(target) &&
            target.isEmpty() &&
            target.canReplaceWith(node)
          ) {
            target.replace(node);
            target = node;
            didReplaceOrMerge = true;
            continue;
          }
          // We may have a node tree where there are many levels, for example with
          // lists and tables. So let's find the first descendant to try and merge
          // with. So if we have the target:
          //
          // Paragraph (1)
          //   Text (2)
          //
          // and we are trying to insert:
          //
          // ListNode (3)
          //   ListItemNode (4)
          //     Text (5)
          //   ListItemNode (6)
          //
          // The result would be:
          //
          // Paragraph (1)
          //   Text (2)
          //   Text (5)
          //

          const firstDescendant = node.getFirstDescendant();
          if ($isLeafNode(firstDescendant)) {
            let element = firstDescendant.getParentOrThrow();
            while (element.isInline()) {
              element = element.getParentOrThrow();
            }
            const children = element.getChildren();
            const childrenLength = children.length;
            if ($isElementNode(target)) {
              for (let s = 0; s < childrenLength; s++) {
                lastNodeInserted = children[s];
                target.append(lastNodeInserted);
              }
            } else {
              for (let s = childrenLength - 1; s >= 0; s--) {
                lastNodeInserted = children[s];
                target.insertAfter(lastNodeInserted);
              }
              target = target.getParentOrThrow();
            }
            element.remove();
            didReplaceOrMerge = true;
            if (element.is(node)) {
              continue;
            }
          }
        }
        if ($isTextNode(target)) {
          if (topLevelElement === null) {
            invariant(false, 'insertNode: topLevelElement is root node');
          }
          target = topLevelElement;
        }
      } else if (
        didReplaceOrMerge &&
        !$isDecoratorNode(node) &&
        $isRootNode(target.getParent())
      ) {
        invariant(
          false,
          'insertNodes: cannot insert a non-element into a root node',
        );
      }
      didReplaceOrMerge = false;
      if ($isElementNode(target) && !target.isInline()) {
        lastNodeInserted = node;
        if ($isDecoratorNode(node) && node.isTopLevel()) {
          target = target.insertAfter(node);
        } else if (!$isElementNode(node)) {
          const firstChild = target.getFirstChild();
          if (firstChild !== null) {
            firstChild.insertBefore(node);
          } else {
            target.append(node);
          }
          target = node;
        } else {
          if (!node.canBeEmpty() && node.isEmpty()) {
            continue;
          }
          if ($isRootNode(target)) {
            const placementNode = target.getChildAtIndex(anchorOffset);
            if (placementNode !== null) {
              placementNode.insertBefore(node);
            } else {
              target.append(node);
            }
            target = node;
          } else {
            target = target.insertAfter(node);
          }
        }
      } else if (
        !$isElementNode(node) ||
        ($isElementNode(node) && node.isInline()) ||
        ($isDecoratorNode(target) && target.isTopLevel())
      ) {
        lastNodeInserted = node;
        target = target.insertAfter(node);
      } else {
        target = node.getParentOrThrow();
        // Re-try again with the target being the parent
        i--;
        continue;
      }
    }

    if (selectStart) {
      // Handle moving selection to start for all nodes
      if ($isTextNode(startingNode)) {
        startingNode.select();
      } else {
        const prevSibling = target.getPreviousSibling();
        if ($isTextNode(prevSibling)) {
          prevSibling.select();
        } else {
          const index = target.getIndexWithinParent();
          target.getParentOrThrow().select(index, index);
        }
      }
    }

    if ($isElementNode(target)) {
      // If the last node to be inserted was a text node,
      // then we should attempt to move selection to that.
      const lastChild = $isTextNode(lastNodeInserted)
        ? lastNodeInserted
        : target.getLastDescendant();
      if (!selectStart) {
        // Handle moving selection to end for elements
        if (lastChild === null) {
          target.select();
        } else if ($isTextNode(lastChild)) {
          lastChild.select();
        } else {
          lastChild.selectNext();
        }
      }
      if (siblings.length !== 0) {
        for (let i = siblings.length - 1; i >= 0; i--) {
          const sibling = siblings[i];
          const prevParent = sibling.getParentOrThrow();
          if ($isElementNode(target) && !$isElementNode(sibling)) {
            target.append(sibling);
            target = sibling;
          } else if (!$isElementNode(target) && !$isElementNode(sibling)) {
            target.insertBefore(sibling);
            target = sibling;
          } else {
            if ($isElementNode(sibling) && !sibling.canInsertAfter(target)) {
              const prevParentClone = prevParent.constructor.clone(prevParent);
              if (!$isElementNode(prevParentClone)) {
                invariant(
                  false,
                  'insertNodes: cloned parent clone is not an element',
                );
              }
              prevParentClone.append(sibling);
              target.insertAfter(prevParentClone);
            } else {
              target.insertAfter(sibling);
            }
          }
          // Check if the prev parent is empty, as it might need
          // removing.
          if (prevParent.isEmpty() && !prevParent.canBeEmpty()) {
            prevParent.remove();
          }
        }
      }
    } else if (!selectStart) {
      // Handle moving selection to end for other nodes
      if ($isTextNode(target)) {
        target.select();
      } else {
        const element = target.getParentOrThrow();
        const index = target.getIndexWithinParent() + 1;
        element.select(index, index);
      }
    }
    return true;
  }

  insertParagraph(): void {
    if (!this.isCollapsed()) {
      this.removeText();
    }
    const anchor = this.anchor;
    const anchorOffset = anchor.offset;
    let currentElement;
    let nodesToMove = [];
    let siblingsToMove = [];
    if (anchor.type === 'text') {
      const anchorNode = anchor.getNode();
      nodesToMove = anchorNode.getNextSiblings().reverse();
      currentElement = anchorNode.getParentOrThrow();
      const isInline = currentElement.isInline();
      const textContentLength = isInline
        ? currentElement.getTextContentSize()
        : anchorNode.getTextContentSize();
      if (anchorOffset === 0) {
        nodesToMove.push(anchorNode);
      } else {
        if (isInline) {
          // For inline nodes, we want to move all the siblings to the new paragraph
          // if selection is at the end, we just move the siblings. Otherwise, we also
          // split the text node and add that and it's siblings below.
          siblingsToMove = currentElement.getNextSiblings();
        }
        if (anchorOffset !== textContentLength) {
          if (!isInline || anchorOffset !== anchorNode.getTextContentSize()) {
            const [, splitNode] = anchorNode.splitText(anchorOffset);
            nodesToMove.push(splitNode);
          }
        }
      }
    } else {
      currentElement = anchor.getNode();
      if ($isRootNode(currentElement)) {
        const paragraph = $createParagraphNode();
        const child = currentElement.getChildAtIndex(anchorOffset);
        paragraph.select();
        if (child !== null) {
          child.insertBefore(paragraph);
        } else {
          currentElement.append(paragraph);
        }
        return;
      }
      nodesToMove = currentElement.getChildren().slice(anchorOffset).reverse();
    }
    const nodesToMoveLength = nodesToMove.length;
    if (
      anchorOffset === 0 &&
      nodesToMoveLength > 0 &&
      currentElement.isInline()
    ) {
      const parent = currentElement.getParentOrThrow();
      const newElement = parent.insertNewAfter(this);
      if ($isElementNode(newElement)) {
        const children = parent.getChildren();
        for (let i = 0; i < children.length; i++) {
          newElement.append(children[i]);
        }
      }
      return;
    }
    const newElement = currentElement.insertNewAfter(this);
    if (newElement === null) {
      // Handle as a line break insertion
      this.insertLineBreak();
    } else if ($isElementNode(newElement)) {
      // If we're at the beginning of the current element, move the new element to be before the current element
      const currentElementFirstChild = currentElement.getFirstChild();
      const isBeginning =
        anchorOffset === 0 &&
        (currentElement.is(anchor.getNode()) ||
          (currentElementFirstChild &&
            currentElementFirstChild.is(anchor.getNode())));
      if (isBeginning && nodesToMoveLength > 0) {
        currentElement.insertBefore(newElement);
        return;
      }
      let firstChild = null;
      const siblingsToMoveLength = siblingsToMove.length;
      const parent = newElement.getParentOrThrow();
      // For inline elements, we append the siblings to the parent.
      if (siblingsToMoveLength > 0) {
        for (let i = 0; i < siblingsToMoveLength; i++) {
          const siblingToMove = siblingsToMove[i];
          parent.append(siblingToMove);
        }
      }
      if (nodesToMoveLength !== 0) {
        for (let i = 0; i < nodesToMoveLength; i++) {
          const nodeToMove = nodesToMove[i];
          if (firstChild === null) {
            newElement.append(nodeToMove);
          } else {
            firstChild.insertBefore(nodeToMove);
          }
          firstChild = nodeToMove;
        }
      }
      if (!newElement.canBeEmpty() && newElement.getChildrenSize() === 0) {
        newElement.selectPrevious();
        newElement.remove();
      } else {
        newElement.selectStart();
      }
    }
  }

  insertLineBreak(selectStart?: boolean): void {
    const lineBreakNode = $createLineBreakNode();
    const anchor = this.anchor;
    if (anchor.type === 'element') {
      const element = anchor.getNode();
      if ($isRootNode(element)) {
        this.insertParagraph();
      }
    }
    if (selectStart) {
      this.insertNodes([lineBreakNode], true);
    } else {
      if (this.insertNodes([lineBreakNode])) {
        lineBreakNode.selectNext(0, 0);
      }
    }
  }

  getCharacterOffsets(): [number, number] {
    return getCharacterOffsets(this);
  }

  extract(): Array<LexicalNode> {
    const selectedNodes = this.getNodes();
    const selectedNodesLength = selectedNodes.length;
    const lastIndex = selectedNodesLength - 1;
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = selectedNodes[0];
    let lastNode = selectedNodes[lastIndex];
    const [anchorOffset, focusOffset] = getCharacterOffsets(this);

    if (selectedNodesLength === 0) {
      return [];
    } else if (selectedNodesLength === 1) {
      if ($isTextNode(firstNode)) {
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

  modify(
    alter: 'move' | 'extend',
    isBackward: boolean,
    granularity: 'character' | 'word' | 'lineboundary',
  ): void {
    const focus = this.focus;
    const anchor = this.anchor;
    const collapse = alter === 'move';

    // Handle the selection movement around decorators.
    const possibleNode = $getDecoratorNode(focus, isBackward);
    if ($isDecoratorNode(possibleNode) && !possibleNode.isIsolated()) {
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

    const domSelection = getDOMSelection();
    // We use the DOM selection.modify API here to "tell" us what the selection
    // will be. We then use it to update the Lexical selection accordingly. This
    // is much more reliable than waiting for a beforeinput and using the ranges
    // from getTargetRanges(), and is also better than trying to do it ourselves
    // using Intl.Segmenter or other workarounds that struggle with word segments
    // and line segments (especially with word wrapping and non-Roman languages).
    $moveNativeSelection(
      domSelection,
      alter,
      isBackward ? 'backward' : 'forward',
      granularity,
    );
    // Guard against no ranges
    if (domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      // Apply the DOM selection to our Lexical selection.
      // $FlowFixMe[incompatible-call]
      this.applyDOMRange(range);
      this.dirty = true;
      // Because a range works on start and end, we might need to flip
      // the anchor and focus points to match what the DOM has, not what
      // the range has specifically.
      if (
        !collapse &&
        (domSelection.anchorNode !== range.startContainer ||
          domSelection.anchorOffset !== range.startOffset)
      ) {
        $swapPoints(this);
      }
    }
  }

  deleteCharacter(isBackward: boolean): void {
    if (this.isCollapsed()) {
      const anchor = this.anchor;
      const focus = this.focus;
      let anchorNode = anchor.getNode();
      if (
        !isBackward &&
        // Delete forward handle case
        ((anchor.type === 'element' &&
          // $FlowFixMe: always an element node
          anchor.offset === (anchorNode: ElementNode).getChildrenSize()) ||
          (anchor.type === 'text' &&
            anchor.offset === anchorNode.getTextContentSize()))
      ) {
        const nextSibling =
          anchorNode.getNextSibling() ||
          anchorNode.getParentOrThrow().getNextSibling();

        if ($isElementNode(nextSibling) && !nextSibling.canExtractContents()) {
          return;
        }
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
  }

  deleteLine(isBackward: boolean): void {
    if (this.isCollapsed()) {
      this.modify('extend', isBackward, 'lineboundary');
    }
    this.removeText();
  }

  deleteWord(isBackward: boolean): void {
    if (this.isCollapsed()) {
      this.modify('extend', isBackward, 'word');
    }
    this.removeText();
  }
}

export function $isNodeSelection(x: ?mixed): boolean %checks {
  return x instanceof NodeSelection;
}

function getCharacterOffset(point: PointType): number {
  const offset = point.offset;
  if (point.type === 'text') {
    return offset;
  }
  // $FlowFixMe: cast
  const parent: ElementNode = point.getNode();
  return offset === parent.getChildrenSize()
    ? parent.getTextContent().length
    : 0;
}

function getCharacterOffsets(
  selection: RangeSelection | GridSelection,
): [number, number] {
  const anchor = selection.anchor;
  const focus = selection.focus;
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

function $moveNativeSelection(
  domSelection,
  alter: 'move' | 'extend',
  direction: 'backward' | 'forward' | 'left' | 'right',
  granularity: 'character' | 'word' | 'lineboundary',
): void {
  // $FlowFixMe[prop-missing]
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
  let restoreOffset = 0;

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
): null | PointType {
  let resolvedOffset = offset;
  let resolvedNode: LexicalNode | null;
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
    const childDOM = childNodes[resolvedOffset];
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
            resolvedElement = child.getParentOrThrow();
          }
        }
        if ($isTextNode(child)) {
          resolvedNode = child;
          resolvedElement = null;
          resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
        } else if (child !== resolvedElement && moveSelectionToEnd) {
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
        // $FlowFixMe: intentional
        point.type = 'element';
      } else if ($isTextNode(prevSibling) && !prevSibling.isInert()) {
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
      // $FlowFixMe: intentional
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
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
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
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
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
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = internalResolveSelectionPoint(
    focusDOM,
    focusOffset,
    $isRangeSelection(lastSelection) ? lastSelection.focus : null,
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
  );
  selection.dirty = true;
  editorState._selection = selection;
  return selection;
}

export function $createEmptyRangeSelection(): RangeSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new RangeSelection(anchor, focus, 0);
}

export function $createEmptyObjectSelection(): NodeSelection {
  return new NodeSelection(new Set());
}

export function $createEmptyGridSelection(): GridSelection {
  const anchor = $createPoint('root', 0, 'element');
  const focus = $createPoint('root', 0, 'element');
  return new GridSelection('root', anchor, focus);
}

export function internalCreateSelection(
  editor: LexicalEditor,
): null | RangeSelection | NodeSelection | GridSelection {
  const currentEditorState = editor.getEditorState();
  const lastSelection = currentEditorState._selection;
  const domSelection = getDOMSelection();

  if ($isNodeSelection(lastSelection) || $isGridSelection(lastSelection)) {
    return lastSelection.clone();
  }

  return internalCreateRangeSelection(lastSelection, domSelection, editor);
}

function internalCreateRangeSelection(
  lastSelection: null | RangeSelection | NodeSelection | GridSelection,
  domSelection: Selection | null,
  editor: LexicalEditor,
): null | RangeSelection {
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

  const windowEvent = window.event;
  const eventType = windowEvent ? windowEvent.type : undefined;
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    !getIsProcesssingMutations() &&
    (isSelectionChange ||
      eventType === 'beforeinput' ||
      eventType === 'compositionstart' ||
      eventType === 'compositionend' ||
      (eventType === 'click' && windowEvent && windowEvent.detail === 3) ||
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
  );
}

export function $getSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection {
  const editorState = getActiveEditorState();
  return editorState._selection;
}

export function $getPreviousSelection():
  | null
  | RangeSelection
  | NodeSelection
  | GridSelection {
  const editor = getActiveEditor();
  return editor._editorState._selection;
}

export function internalCreateSelectionFromParse(
  parsedSelection: null | ParsedSelection,
): null | RangeSelection | NodeSelection | GridSelection {
  if (parsedSelection !== null) {
    if (parsedSelection.type === 'range') {
      return new RangeSelection(
        $createPoint(
          parsedSelection.anchor.key,
          parsedSelection.anchor.offset,
          parsedSelection.anchor.type,
        ),
        $createPoint(
          parsedSelection.focus.key,
          parsedSelection.focus.offset,
          parsedSelection.focus.type,
        ),
        0,
      );
    } else if (parsedSelection.type === 'node') {
      return new NodeSelection(new Set(parsedSelection.nodes));
    } else if (parsedSelection.type === 'grid') {
      return new GridSelection(
        parsedSelection.gridKey,
        $createPoint(
          parsedSelection.anchor.key,
          parsedSelection.anchor.offset,
          parsedSelection.anchor.type,
        ),
        $createPoint(
          parsedSelection.focus.key,
          parsedSelection.focus.offset,
          parsedSelection.focus.type,
        ),
      );
    }
  }
  return null;
}

export function $updateElementSelectionOnCreateDeleteNode(
  selection: RangeSelection,
  parentNode: LexicalNode,
  nodeOffset: number,
  times: number = 1,
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
    if (nodeOffset <= selectionOffset) {
      const newSelectionOffset = Math.max(0, selectionOffset + times);
      anchor.set(parentKey, newSelectionOffset, 'element');
      focus.set(parentKey, newSelectionOffset, 'element');
      // The new selection might point to text nodes, try to resolve them
      $updateSelectionResolveTextNodes(selection);
    }
    return;
  }
  // Multiple nodes selected. We shift or redimension selection
  const isBackward = selection.isBackward();
  const firstPoint = isBackward ? focus : anchor;
  const firstPointNode = firstPoint.getNode();
  const lastPoint = isBackward ? anchor : focus;
  const lastPointNode = lastPoint.getNode();
  if (parentNode.is(firstPointNode)) {
    const firstPointOffset = firstPoint.offset;
    if (nodeOffset <= firstPointOffset) {
      firstPoint.set(
        parentKey,
        Math.max(0, firstPointOffset + times),
        'element',
      );
    }
  }
  if (parentNode.is(lastPointNode)) {
    const lastPointOffset = lastPoint.offset;
    if (nodeOffset <= lastPointOffset) {
      lastPoint.set(parentKey, Math.max(0, lastPointOffset + times), 'element');
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
  let type = null;
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
