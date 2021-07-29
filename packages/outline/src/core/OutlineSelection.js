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
import {getDOMTextNode, isSelectionWithinEditor} from './OutlineUtils';
import invariant from 'shared/invariant';
import {ZERO_WIDTH_JOINER_CHAR} from './OutlineConstants';

// TODO
// type BlockStartPoint = {
//   node: BlockNode,
//   type: 'start',
// }

// type BlockEndPoint = {
//   node: BlockNode,
//   type: 'end',
// }

class Point {
  key: NodeKey;
  offset: number;

  constructor(key: NodeKey, offset: number) {
    this.key = key;
    this.offset = offset;
  }
  is(point: Point): boolean {
    return this.key === point.key && this.offset === point.offset;
  }
  getType(): 'character' {
    return 'character';
  }
  getNode(): TextNode {
    const key = this.key;
    const node = getNodeByKey<TextNode>(key);
    if (!isTextNode(node)) {
      invariant(false, 'getNode: node not a text node');
    }
    return node;
  }
}

export class Selection {
  anchor: Point;
  focus: Point;
  isDirty: boolean;

  constructor(anchor: Point, focus: Point) {
    this.anchor = anchor;
    this.focus = focus;
    this.isDirty = false;
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
  setBaseAndExtent(
    anchorKey: NodeKey,
    anchorOffset: number,
    focusKey: NodeKey,
    focusOffset: number,
  ): void {
    this.anchor.offset = anchorOffset;
    this.focus.offset = focusOffset;
    this.anchor.key = anchorKey;
    this.focus.key = focusKey;
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
    const anchorOffset = this.anchor.offset;
    const focusOffset = this.focus.offset;
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
    const resolvedSelectionNodesAndOffsets = resolveSelectionNodesAndOffsets(
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      editor,
    );
    if (resolvedSelectionNodesAndOffsets === null) {
      return;
    }
    const [anchorNode, focusNode, anchorOffset, focusOffset] =
      resolvedSelectionNodesAndOffsets;
    const anchor = this.anchor;
    const focus = this.focus;
    anchor.key = anchorNode.__key;
    focus.key = focusNode.__key;
    anchor.offset = anchorOffset;
    focus.offset = focusOffset;
  }
  clone(): Selection {
    const anchor = this.anchor;
    const focus = this.focus;
    return new Selection(
      new Point(anchor.key, anchor.offset),
      new Point(focus.key, focus.offset),
    );
  }
}

function resolveNonLineBreakOrInertNode(node: OutlineNode): [TextNode, number] {
  const resolvedNode = node.getPreviousSibling();
  if (!isTextNode(resolvedNode)) {
    invariant(
      false,
      'resolveNonLineBreakOrInertNode: resolved node not a text node',
    );
  }
  const offset = resolvedNode.getTextContentSize();
  return [resolvedNode, offset];
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

function resolveSelectionNodeAndOffset(
  dom: Node,
  offset: number,
  editor: OutlineEditor,
): null | [TextNode, number] {
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

  return [resolvedNode, resolvedOffset];
}

function resolveSelectionNodesAndOffsets(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: OutlineEditor,
): null | [TextNode, TextNode, number, number] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  const resolveAnchorNodeAndOffset = resolveSelectionNodeAndOffset(
    anchorDOM,
    anchorOffset,
    editor,
  );
  if (resolveAnchorNodeAndOffset === null) {
    return null;
  }
  let resolvedAnchorNode = resolveAnchorNodeAndOffset[0];
  let resolvedAnchorOffset = resolveAnchorNodeAndOffset[1];
  const resolveFocusNodeAndOffset = resolveSelectionNodeAndOffset(
    focusDOM,
    focusOffset,
    editor,
  );
  if (resolveFocusNodeAndOffset === null) {
    return null;
  }
  let resolvedFocusNode = resolveFocusNodeAndOffset[0];
  let resolvedFocusOffset = resolveFocusNodeAndOffset[1];

  // Handle normalization of selection when it is at the boundaries.
  const textContentSize = resolvedAnchorNode.getTextContentSize();
  // Once we remove zero width characters, we will no longer need this
  // check as it will become redundant (we won't allow empty text nodes).
  if (textContentSize !== 0) {
    if (
      resolvedAnchorNode === resolvedFocusNode &&
      resolvedAnchorOffset === resolvedFocusOffset
    ) {
      if (resolvedAnchorOffset === 0) {
        const prevSibling = resolvedAnchorNode.getPreviousSibling();
        if (isTextNode(prevSibling) && !prevSibling.isImmutable()) {
          const offset = prevSibling.getTextContentSize();
          resolvedAnchorNode = prevSibling;
          resolvedFocusNode = prevSibling;
          resolvedAnchorOffset = offset;
          resolvedFocusOffset = offset;
        }
      }
    } else {
      if (resolvedAnchorOffset === textContentSize) {
        const nextSibling = resolvedAnchorNode.getNextSibling();
        if (isTextNode(nextSibling) && !nextSibling.isImmutable()) {
          resolvedAnchorNode = nextSibling;
          resolvedAnchorOffset = 0;
        }
      }
    }
  }

  const currentViewModel = editor.getViewModel();
  const lastSelection = currentViewModel._selection;
  if (
    editor.isComposing() &&
    editor._compositionKey !== resolvedAnchorNode.__key &&
    lastSelection !== null
  ) {
    resolvedAnchorNode = lastSelection.anchor.getNode();
    resolvedAnchorOffset = lastSelection.anchor.offset;
    resolvedFocusNode = lastSelection.focus.getNode();
    resolvedFocusOffset = lastSelection.focus.offset;
  }

  return [
    resolvedAnchorNode,
    resolvedFocusNode,
    resolvedAnchorOffset,
    resolvedFocusOffset,
  ];
}

// This is used to make a selection when the existing
// selection is null, i.e. forcing selection on the editor
// when it current exists outside the editor.
export function makeSelection(
  anchorKey: NodeKey,
  anchorOffset: number,
  focusKey: NodeKey,
  focusOffset: number,
): Selection {
  const viewModel = getActiveViewModel();
  const selection = new Selection(
    new Point(anchorKey, anchorOffset),
    new Point(focusKey, focusOffset),
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
    eventType === 'input' ||
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
    return new Selection(
      new Point(lastSelection.anchor.key, lastSelection.anchor.offset),
      new Point(lastSelection.focus.key, lastSelection.focus.offset),
    );
  }
  // Let's resolve the text nodes from the offsets and DOM nodes we have from
  // native selection.
  const resolvedSelectionNodesAndOffsets = resolveSelectionNodesAndOffsets(
    anchorDOM,
    anchorOffset,
    focusDOM,
    focusOffset,
    editor,
  );
  if (resolvedSelectionNodesAndOffsets === null) {
    return null;
  }
  const [
    resolvedAnchorNode,
    resolvedFocusNode,
    resolvedAnchorOffset,
    resolvedFocusOffset,
  ] = resolvedSelectionNodesAndOffsets;

  const selection = new Selection(
    new Point(resolvedAnchorNode.__key, resolvedAnchorOffset),
    new Point(resolvedFocusNode.__key, resolvedFocusOffset),
  );

  return selection;
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
    },
    focus: {
      key: string,
      offset: number,
    },
  },
): null | Selection {
  return parsedSelection === null
    ? null
    : new Selection(
        new Point(parsedSelection.anchor.key, parsedSelection.anchor.offset),
        new Point(parsedSelection.focus.key, parsedSelection.focus.offset),
      );
}
