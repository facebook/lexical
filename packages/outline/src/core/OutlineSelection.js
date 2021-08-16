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
import type {LineBreakNode} from './OutlineLineBreakNode';
import type {DecoratorNode} from './OutlineDecoratorNode';

import {getActiveEditor, ViewModel} from './OutlineView';
import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {
  isTextNode,
  isBlockNode,
  isLineBreakNode,
  isDecoratorNode,
  TextNode,
} from '.';
import {
  getDOMTextNode,
  isSelectionWithinEditor,
  toggleTextFormatType,
} from './OutlineUtils';
import invariant from 'shared/invariant';
import {ZERO_WIDTH_JOINER_CHAR} from './OutlineConstants';

type CharacterPointType = {
  key: NodeKey,
  offset: number,
  type: 'character',
  is: (PointType) => boolean,
  getNode: () => TextNode,
};

type StartPointType = {
  key: NodeKey,
  offset: null,
  type: 'start',
  is: (PointType) => boolean,
  getNode: () => BlockNode,
};

type AfterNodePointType = {
  key: NodeKey,
  offset: null,
  type: 'after',
  is: (PointType) => boolean,
  getNode: () => DecoratorNode | TextNode | LineBreakNode,
};

export type PointType =
  | CharacterPointType
  | AfterNodePointType
  | StartPointType;

class Point {
  key: NodeKey;
  offset: number;
  type: 'character' | 'after' | 'start';

  constructor(
    key: NodeKey,
    offset: number,
    type: 'character' | 'after' | 'start',
  ) {
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
  getNode() {
    const key = this.key;
    const node = getNodeByKey(key);
    if (node === null) {
      invariant(false, 'Point.getNode: node not found');
    }
    return node;
  }
}

function createPoint(
  key: NodeKey,
  offset: null | number,
  type: 'character' | 'after' | 'start',
): PointType {
  // $FlowFixMe: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

export function setPointValues(
  point: PointType,
  key: NodeKey,
  offset: null | number,
  type: 'character' | 'after' | 'start',
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
  isDirty: boolean;
  textFormat: number;

  constructor(anchor: PointType, focus: PointType, textFormat: number) {
    this.anchor = anchor;
    this.focus = focus;
    this.isDirty = false;
    this.textFormat = textFormat;
  }

  is(selection: Selection): boolean {
    return this.anchor.is(selection.anchor) && this.focus.is(selection.focus);
  }
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }
  getNodes(): Array<OutlineNode> {
    const anchorNode = this.anchor.getNode();
    const focusNode = this.focus.getNode();
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  }
  setTextNodeRange(
    anchorNode: TextNode,
    anchorOffset: number,
    focusNode: TextNode,
    focusOffset: number,
  ): void {
    setPointValues(this.anchor, anchorNode.__key, anchorOffset, 'character');
    setPointValues(this.focus, focusNode.__key, focusOffset, 'character');
    this.isDirty = true;
  }
  getTextContent(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const isBefore = firstNode === this.anchor.getNode();
    const anchorOffset = this.anchor.offset || 0;
    const focusOffset = this.focus.offset || 0;
    let textContent = '';
    nodes.forEach((node) => {
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
      } else if (isBlockNode(node) || isLineBreakNode(node)) {
        textContent += '\n';
      } else if (isDecoratorNode(node)) {
        textContent += node.getTextContent();
      }
    });
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
    this.isDirty = true;
  }
}

function resolveNonLineBreakOrInertNode(node: OutlineNode): PointType {
  const resolvedNode = node.getPreviousSibling();
  if (!isTextNode(resolvedNode)) {
    invariant(
      false,
      'resolveNonLineBreakOrInertNode: resolved node not a text node',
    );
  }
  const offset = resolvedNode.getTextContentSize();
  return createPoint(resolvedNode.__key, offset, 'character');
}

function getNodeFromDOM(dom: Node): null | OutlineNode {
  const nodeKey = getNodeKeyFromDOM(dom);
  if (nodeKey === null) {
    return null;
  }
  return getNodeByKey(nodeKey);
}

function domIsElement(dom: Node): boolean {
  return dom.nodeType === 1;
}

function resolveSelectionPoint(
  dom: Node,
  offset: number,
  editor: OutlineEditor,
): null | PointType {
  let resolvedDOM = dom;
  let resolvedOffset = offset;
  let resolvedNode;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (domIsElement(resolvedDOM) && resolvedDOM.nodeName !== 'BR') {
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    // We use the anchor to find which child node to select
    const childNodes = resolvedDOM.childNodes;
    const childNodesLength = childNodes.length;
    // If the anchor is the same as length, then this means we
    // need to select the very last text node.
    if (resolvedOffset === childNodesLength) {
      moveSelectionToEnd = true;
      resolvedOffset = childNodesLength - 1;
    }
    resolvedDOM = childNodes[resolvedOffset];
    resolvedNode = getNodeFromDOM(resolvedDOM);
    if (isBlockNode(resolvedNode)) {
      if (moveSelectionToEnd) {
        resolvedNode = resolvedNode.getLastTextNode();
        if (resolvedNode === null) {
          return null;
        }
        resolvedOffset = resolvedNode.getTextContentSize();
      } else {
        resolvedNode = resolvedNode.getFirstTextNode();
        resolvedOffset = 0;
      }
    } else if (isTextNode(resolvedNode)) {
      if (moveSelectionToEnd) {
        resolvedOffset = resolvedNode.getTextContentSize();
      } else {
        resolvedOffset = 0;
      }
    }
  } else {
    resolvedNode = getNodeFromDOM(resolvedDOM);
  }
  if (
    isLineBreakNode(resolvedNode) ||
    (isTextNode(resolvedNode) && resolvedNode.isInert())
  ) {
    return resolveNonLineBreakOrInertNode(resolvedNode);
  }
  if (!isTextNode(resolvedNode)) {
    return null;
  }
  const textNode = getDOMTextNode(resolvedDOM);

  if (
    textNode !== null &&
    resolvedOffset !== 0 &&
    textNode.nodeValue[0] === ZERO_WIDTH_JOINER_CHAR
  ) {
    resolvedOffset--;
  }

  if (resolvedNode.getTextContent() === '') {
    // Because we use a special character for whitespace
    // at the start of empty strings, we need to remove one
    // from the offset.
    resolvedOffset = 0;
  }

  return createPoint(resolvedNode.__key, resolvedOffset, 'character');
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
    resolvedAnchorPoint.type === 'character' &&
    resolvedFocusPoint.type === 'character'
  ) {
    const resolvedAnchorNode = resolvedAnchorPoint.getNode();
    const resolvedFocusNode = resolvedFocusPoint.getNode();
    // Handle normalization of selection when it is at the boundaries.
    const textContentSize = resolvedAnchorNode.getTextContentSize();
    // Once we remove zero width characters, we will no longer need this
    // check as it will become redundant (we won't allow empty text nodes).
    if (textContentSize !== 0) {
      const resolvedAnchorOffset = resolvedAnchorPoint.offset;
      const resolvedFocusOffset = resolvedFocusPoint.offset;
      if (
        resolvedAnchorNode === resolvedFocusNode &&
        resolvedAnchorOffset === resolvedFocusOffset
      ) {
        if (anchorOffset === 0) {
          const prevSibling = resolvedAnchorNode.getPreviousSibling();
          if (isTextNode(prevSibling) && !prevSibling.isImmutable()) {
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
          if (isTextNode(nextSibling) && !nextSibling.isImmutable()) {
            resolvedAnchorPoint.key = nextSibling.__key;
            resolvedAnchorPoint.offset = 0;
          }
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
  anchorOffset: null | number,
  focusKey: NodeKey,
  focusOffset: null | number,
  anchorType: 'character' | 'after' | 'start',
  focusType: 'character' | 'after' | 'start',
): Selection {
  const viewModel = getActiveViewModel();
  const selection = new Selection(
    createPoint(anchorKey, anchorOffset, anchorType),
    createPoint(focusKey, focusOffset, focusType),
    0,
  );
  selection.isDirty = true;
  viewModel._selection = selection;
  return selection;
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
      offset: null | number,
      type: 'character' | 'after' | 'start',
    },
    focus: {
      key: string,
      offset: null | number,
      type: 'character' | 'after' | 'start',
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
