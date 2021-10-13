/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey} from './OutlineNode';
import type {OutlineEditor} from './OutlineEditor';
import type {BlockNode} from './OutlineBlockNode';
import type {TextFormatType} from './OutlineTextNode';
import type {RootNode} from './OutlineRootNode';

import {getActiveEditor, ViewModel, isViewReadOnlyMode} from './OutlineView';
import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {
  getNodeByKey,
  getCompositionKey,
  setCompositionKey,
} from './OutlineNode';
import {
  isTextNode,
  isBlockNode,
  isLineBreakNode,
  isDecoratorNode,
  isRootNode,
  TextNode,
} from '.';
import {isSelectionWithinEditor, toggleTextFormatType} from './OutlineUtils';
import invariant from 'shared/invariant';

export type TextPointType = {
  key: NodeKey,
  offset: number,
  type: 'text',
  is: (PointType) => boolean,
  isBefore: (PointType) => boolean,
  getNode: () => TextNode,
  set: (key: NodeKey, offset: number, type: 'text' | 'block') => void,
  getCharacterOffset: () => number,
};

export type BlockPointType = {
  key: NodeKey,
  offset: number,
  type: 'block',
  is: (PointType) => boolean,
  isBefore: (PointType) => boolean,
  getNode: () => BlockNode,
  set: (key: NodeKey, offset: number, type: 'text' | 'block') => void,
  getCharacterOffset: () => number,
};

export type PointType = TextPointType | BlockPointType;

class Point {
  key: NodeKey;
  offset: number;
  type: 'text' | 'block';

  constructor(key: NodeKey, offset: number, type: 'text' | 'block') {
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

    if (isBlockNode(aNode)) {
      aNode = aNode.getDescendantByIndex(aOffset);
    }
    if (isBlockNode(bNode)) {
      bNode = bNode.getDescendantByIndex(bOffset);
    }
    if (aNode === bNode) {
      return aOffset < bOffset;
    }
    return aNode.isBefore(bNode);
  }
  getCharacterOffset(): number {
    return this.type === 'text' ? this.offset : 0;
  }
  getNode() {
    const key = this.key;
    const node = getNodeByKey(key);
    if (node === null) {
      invariant(false, 'Point.getNode: node not found');
    }
    return node;
  }
  set(key: NodeKey, offset: number, type: 'text' | 'block'): void {
    const selection = getSelection();
    const oldKey = this.key;
    this.key = key;
    this.offset = offset;
    this.type = type;
    if (!isViewReadOnlyMode()) {
      if (getCompositionKey() === oldKey) {
        setCompositionKey(key);
      }
      if (
        selection !== null &&
        (selection.anchor === this || selection.focus === this)
      ) {
        selection.dirty = true;
      }
    }
  }
}

function createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'block',
): PointType {
  // $FlowFixMe: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

function selectPointOnNode(point: PointType, node: OutlineNode): void {
  const key = node.getKey();
  let offset = point.offset;
  let type = 'block';
  if (isTextNode(node)) {
    type = 'text';
    const textContentLength = node.getTextContentSize();
    if (offset > textContentLength) {
      offset = textContentLength;
    }
  }
  point.set(key, offset, type);
}

export function moveSelectionPointToEnd(
  point: PointType,
  node: OutlineNode,
): void {
  if (isBlockNode(node)) {
    const lastNode = node.getLastDescendant();
    if (isBlockNode(lastNode) || isTextNode(lastNode)) {
      selectPointOnNode(point, lastNode);
    } else {
      selectPointOnNode(point, node);
    }
  } else if (isTextNode(node)) {
    selectPointOnNode(point, node);
  }
}

export function setPointValues(
  point: PointType,
  key: NodeKey,
  offset: number,
  type: 'text' | 'block',
): void {
  point.key = key;
  // $FlowFixMe: internal utility function
  point.offset = offset;
  // $FlowFixMe: internal utility function
  point.type = type;
}

export class Selection {
  anchor: PointType;
  focus: PointType;
  dirty: boolean;
  textFormat: number;

  constructor(anchor: PointType, focus: PointType, textFormat: number) {
    this.anchor = anchor;
    this.focus = focus;
    this.dirty = false;
    this.textFormat = textFormat;
  }

  is(selection: Selection): boolean {
    return this.anchor.is(selection.anchor) && this.focus.is(selection.focus);
  }
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }
  getNodes(): Array<OutlineNode> {
    const anchor = this.anchor;
    const focus = this.focus;
    let firstNode = anchor.getNode();
    let lastNode = focus.getNode();

    if (isBlockNode(firstNode)) {
      firstNode = firstNode.getDescendantByIndex(anchor.offset);
    }
    if (isBlockNode(lastNode)) {
      lastNode = lastNode.getDescendantByIndex(focus.offset);
    }
    if (firstNode === lastNode) {
      if (isBlockNode(firstNode)) {
        return [];
      }
      return [firstNode];
    }
    const nodes = firstNode.getNodesBetween(lastNode);
    return nodes;
  }
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'text');
    setPointValues(this.focus, focusNode.__key, focusOffset, 'text');
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
    const anchorOffset = anchor.getCharacterOffset();
    const focusOffset = focus.getCharacterOffset();
    let textContent = '';
    let prevWasBlock = true;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (isBlockNode(node)) {
        if (!prevWasBlock) {
          textContent += '\n';
        }
        if (node.getChildrenSize() === 0) {
          prevWasBlock = false;
        } else {
          prevWasBlock = true;
        }
      } else {
        prevWasBlock = false;
        if (isTextNode(node)) {
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
        } else if (isLineBreakNode(node)) {
          textContent += '\n';
        } else if (isDecoratorNode(node)) {
          textContent += node.getTextContent();
        }
      }
    }
    return textContent;
  }
  applyDOMRange(range: StaticRange): void {
    const editor = getActiveEditor();
    const resolvedSelectionPoints = resolveSelectionPoints(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
    );
    if (resolvedSelectionPoints === null) {
      return;
    }
    const [anchorPoint, focusPoint] = resolvedSelectionPoints;
    setPointValues(
      this.anchor,
      anchorPoint.key,
      anchorPoint.offset,
      anchorPoint.type,
    );
    setPointValues(
      this.focus,
      focusPoint.key,
      focusPoint.offset,
      focusPoint.type,
    );
  }
  clone(): Selection {
    const anchor = this.anchor;
    const focus = this.focus;
    return new Selection(
      createPoint(anchor.key, anchor.offset, anchor.type),
      createPoint(focus.key, focus.offset, focus.type),
      this.textFormat,
    );
  }
  swapPoints(): void {
    const focus = this.focus;
    const anchor = this.anchor;
    const anchorKey = anchor.key;
    const anchorOffset = anchor.offset;
    const anchorType = anchor.type;

    setPointValues(anchor, focus.key, focus.offset, focus.type);
    setPointValues(focus, anchorKey, anchorOffset, anchorType);
  }
  toggleTextFormatType(formatType: TextFormatType): void {
    this.textFormat = toggleTextFormatType(this.textFormat, formatType, null);
    this.dirty = true;
  }
}

function getNodeFromDOM(dom: Node): null | OutlineNode {
  const nodeKey = getNodeKeyFromDOM(dom);
  if (nodeKey === null) {
    const editor = getActiveEditor();
    const rootElement = editor.getRootElement();
    if (dom === rootElement) {
      return getNodeByKey('root');
    }
    return null;
  }
  return getNodeByKey(nodeKey);
}

function domIsElement(dom: Node): boolean {
  return dom.nodeType === 1;
}

function getTextNodeOffset(
  node: TextNode,
  moveSelectionToEnd: boolean,
): number {
  return moveSelectionToEnd ? node.getTextContentSize() : 0;
}

function resolveSelectionPoint(
  dom: Node,
  offset: number,
  editor: OutlineEditor,
): null | PointType {
  let resolvedOffset = offset;
  let resolvedNode: OutlineNode | null;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (domIsElement(dom)) {
    // Resolve element to a BlockNode, or TextNode, or null
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

    if (isTextNode(resolvedNode)) {
      resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
    } else {
      let resolvedBlock = getNodeFromDOM(dom);
      // Ensure resolvedBlock is actually a block.
      if (resolvedBlock === null) {
        return null;
      }
      if (isBlockNode(resolvedBlock)) {
        let child = resolvedBlock.getChildAtIndex(resolvedOffset);
        if (isBlockNode(child)) {
          const descendant = moveSelectionToEnd
            ? child.getLastDescendant()
            : child.getFirstDescendant();
          if (descendant === null) {
            resolvedBlock = child;
            resolvedOffset = 0;
          } else {
            child = descendant;
            resolvedBlock = child.getParentOrThrow();
          }
        }
        if (isTextNode(child)) {
          resolvedNode = child;
          resolvedBlock = null;
          resolvedOffset = getTextNodeOffset(resolvedNode, moveSelectionToEnd);
        } else if (child !== resolvedBlock && moveSelectionToEnd) {
          resolvedOffset++;
        }
      } else {
        resolvedOffset = resolvedBlock.getIndexWithinParent() + 1;
        resolvedBlock = resolvedBlock.getParentOrThrow();
      }
      // You can't select root nodes
      if (isRootNode(resolvedBlock)) {
        return null;
      }
      if (isBlockNode(resolvedBlock)) {
        return createPoint(resolvedBlock.__key, resolvedOffset, 'block');
      }
    }
  } else {
    // TextNode or null
    resolvedNode = getNodeFromDOM(dom);
  }
  if (!isTextNode(resolvedNode)) {
    return null;
  }
  return createPoint(resolvedNode.__key, resolvedOffset, 'text');
}

function resolveSelectionPoints(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: OutlineEditor,
): null | [PointType, PointType] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolvedAnchorPoint = resolveSelectionPoint(
    anchorDOM,
    anchorOffset,
    editor,
  );
  if (resolvedAnchorPoint === null) {
    return null;
  }
  const resolvedFocusPoint = resolveSelectionPoint(
    focusDOM,
    focusOffset,
    editor,
  );
  if (resolvedFocusPoint === null) {
    return null;
  }

  if (
    resolvedAnchorPoint.type === 'text' &&
    resolvedFocusPoint.type === 'text'
  ) {
    const resolvedAnchorNode = resolvedAnchorPoint.getNode();
    const resolvedFocusNode = resolvedFocusPoint.getNode();
    // Handle normalization of selection when it is at the boundaries.
    const textContentSize = resolvedAnchorNode.getTextContentSize();
    const resolvedAnchorOffset = resolvedAnchorPoint.offset;
    const resolvedFocusOffset = resolvedFocusPoint.offset;
    if (
      resolvedAnchorNode === resolvedFocusNode &&
      resolvedAnchorOffset === resolvedFocusOffset
    ) {
      if (anchorOffset === 0) {
        const prevSibling = resolvedAnchorNode.getPreviousSibling();
        if (isTextNode(prevSibling) && !prevSibling.isInert()) {
          const offset = prevSibling.getTextContentSize();
          const key = prevSibling.__key;
          resolvedAnchorPoint.key = key;
          resolvedFocusPoint.key = key;
          resolvedAnchorPoint.offset = offset;
          resolvedFocusPoint.offset = offset;
        }
      }
    } else {
      if (resolvedAnchorOffset === textContentSize) {
        const nextSibling = resolvedAnchorNode.getNextSibling();
        if (isTextNode(nextSibling) && !nextSibling.isInert()) {
          resolvedAnchorPoint.key = nextSibling.__key;
          resolvedAnchorPoint.offset = 0;
        }
      }
    }

    const currentViewModel = editor.getViewModel();
    const lastSelection = currentViewModel._selection;
    if (
      editor.isComposing() &&
      editor._compositionKey !== resolvedAnchorPoint.key &&
      lastSelection !== null
    ) {
      const lastAnchor = lastSelection.anchor;
      const lastFocus = lastSelection.focus;
      setPointValues(
        resolvedAnchorPoint,
        lastAnchor.key,
        lastAnchor.offset,
        lastAnchor.type,
      );
      setPointValues(
        resolvedFocusPoint,
        lastFocus.key,
        lastFocus.offset,
        lastFocus.type,
      );
    }
  }

  return [resolvedAnchorPoint, resolvedFocusPoint];
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.
export function makeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
  anchorType: 'text' | 'block',
  focusType: 'text' | 'block',
): Selection {
  const viewModel = getActiveViewModel();
  const selection = new Selection(
    createPoint(anchorKey, anchorOffset, anchorType),
    createPoint(focusKey, focusOffset, focusType),
    0,
  );
  selection.dirty = true;
  viewModel._selection = selection;
  return selection;
}

export function createSelectionAtEnd(root: RootNode): Selection | null {
  // This is a temp point, we will move to end after
  const anchor = createPoint('root', 0, 'block');
  moveSelectionPointToEnd(anchor, root);
  if (anchor.key === 'root') {
    return null;
  }
  const focus = createPoint(anchor.key, anchor.offset, anchor.type);
  return new Selection(anchor, focus, 0);
}

function getActiveEventType(): string | void {
  const event = window.event;
  return event && event.type;
}

export function createSelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): null | Selection {
  // When we create a selection, we try to use the previous
  // selection where possible, unless an actual user selection
  // change has occurred. When we do need to create a new selection
  // we validate we can have text nodes for both anchor and focus
  // nodes. If that holds true, we then return that selection
  // as a mutable object that we use for the view model for this
  // update cycle. If a selection gets changed, and requires a
  // update to native DOM selection, it gets marked as "dirty".
  // If the selection changes, but matches with the existing
  // DOM selection, then we only need to sync it. Otherwise,
  // we generally bail out of doing an update to selection during
  // reconciliation unless there are dirty nodes that need
  // reconciling.

  const currentViewModel = editor.getViewModel();
  const lastSelection = currentViewModel._selection;
  const eventType = getActiveEventType();
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection =
    isSelectionChange ||
    eventType === 'beforeinput' ||
    eventType === 'compositionstart' ||
    eventType === 'compositionend';
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (eventType === undefined || lastSelection === null || useDOMSelection) {
    const domSelection = window.getSelection();
    if (domSelection === null) {
      return null;
    }
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  } else {
    const lastAnchor = lastSelection.anchor;
    const lastFocus = lastSelection.focus;
    return new Selection(
      createPoint(lastAnchor.key, lastAnchor.offset, lastAnchor.type),
      createPoint(lastFocus.key, lastFocus.offset, lastFocus.type),
      lastSelection.textFormat,
    );
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionPoints = resolveSelectionPoints(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
  );
  if (resolvedSelectionPoints === null) {
    return null;
  }
  const [resolvedAnchorPoint, resolvedFocusPoint] = resolvedSelectionPoints;
  return new Selection(
    resolvedAnchorPoint,
    resolvedFocusPoint,
    lastSelection === null ? 0 : lastSelection.textFormat,
  );
}

export function getSelection(): null | Selection {
  const viewModel = getActiveViewModel();
  return viewModel._selection;
}

export function createSelectionFromParse(
  parsedSelection: null | {
    anchor: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
    focus: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
  },
): null | Selection {
  return parsedSelection === null
    ? null
    : new Selection(
        createPoint(
          parsedSelection.anchor.key,
          parsedSelection.anchor.offset,
          parsedSelection.anchor.type,
        ),
        createPoint(
          parsedSelection.focus.key,
          parsedSelection.focus.offset,
          parsedSelection.focus.type,
        ),
        0,
      );
}
