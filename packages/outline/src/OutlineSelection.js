/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey} from './OutlineNode';
import {getActiveEditor, ViewModel} from './OutlineView';

import {getActiveViewModel} from './OutlineView';
import {getNodeKeyFromDOM, getElementByKeyOrThrow} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {isTextNode, isBlockNode, isLineBreakNode, TextNode} from '.';
import {
  invariant,
  getAdjustedSelectionOffset,
  isSelectionWithinEditor,
} from './OutlineUtils';
import {OutlineEditor} from './OutlineEditor';
import {LineBreakNode} from './OutlineLineBreakNode';

export class Selection {
  anchorKey: string;
  anchorOffset: number;
  focusKey: string;
  focusOffset: number;
  isDirty: boolean;
  needsSync: boolean;

  constructor(
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  ) {
    this.anchorKey = anchorKey;
    this.anchorOffset = anchorOffset;
    this.focusKey = focusKey;
    this.focusOffset = focusOffset;
    this.isDirty = false;
    this.needsSync = false;
  }

  isCaret(): boolean {
    return (
      this.anchorKey === this.focusKey && this.anchorOffset === this.focusOffset
    );
  }
  getAnchorNode(): TextNode {
    const anchorKey = this.anchorKey;
    const anchorNode = getNodeByKey<TextNode>(anchorKey);
    if (!isTextNode(anchorNode)) {
      invariant(false, 'getAnchorNode: anchorNode not a text node');
    }
    return anchorNode;
  }
  getFocusNode(): TextNode {
    const focusKey = this.focusKey;
    const focusNode = getNodeByKey<TextNode>(focusKey);
    if (!isTextNode(focusNode)) {
      invariant(false, 'getFocusNode: focusNode not a text node');
    }
    return focusNode;
  }
  getNodes(): Array<OutlineNode> {
    const anchorNode = this.getAnchorNode();
    const focusNode = this.getFocusNode();
    if (anchorNode === focusNode) {
      return [anchorNode];
    }
    return anchorNode.getNodesBetween(focusNode);
  }
  setRange(
    anchorKey: NodeKey,
    anchorOffset: number,
    focusKey: NodeKey,
    focusOffset: number,
  ): void {
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
    this.anchorKey = anchorKey;
    this.focusKey = focusKey;
    this.isDirty = true;
  }
  getTextContent(): string {
    const nodes = this.getNodes();
    if (nodes.length === 0) {
      return '';
    }
    const firstNode = nodes[0];
    const lastNode = nodes[nodes.length - 1];
    const isBefore = firstNode === this.getAnchorNode();
    const anchorOffset = this.anchorOffset;
    const focusOffset = this.focusOffset;
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
      } else if (isBlockNode(node)) {
        textContent += '\n';
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
    this.anchorKey = anchorNode.__key;
    this.focusKey = focusNode.__key;
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
  }
}

function resolveNonLineBreakNode(
  node: LineBreakNode,
): [TextNode, number, boolean] {
  const resolvedNode = node.getPreviousSibling();
  if (!isTextNode(resolvedNode)) {
    invariant(false, 'resolveNonLineBreakNode: resolved node not a text node');
  }
  const offset = resolvedNode.getTextContentSize();
  return [resolvedNode, offset, true];
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
  _isDirty: boolean,
): null | [TextNode, number, boolean] {
  let resolvedDOM = dom;
  let resolvedOffset = offset;
  let resolvedNode;
  let isDirty = _isDirty;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (domIsElement(resolvedDOM) && resolvedDOM.nodeName !== 'BR') {
    let moveSelectionToEnd = false;
    // Given we're moving selection to another node, selection is
    // definitely dirty.
    isDirty = true;
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
  if (isLineBreakNode(resolvedNode)) {
    return resolveNonLineBreakNode(resolvedNode);
  }
  if (!isTextNode(resolvedNode)) {
    return null;
  }
  const resolvedTextNode = resolvedNode;
  // Because we use a special character for whitespace,
  // we need to adjust offsets to 0 when the text is
  // really empty.
  if (resolvedTextNode.__text === '') {
    // When dealing with empty text nodes, we always
    // render a special empty space character, and set
    // the native DOM selection to offset 1 so that
    // text entry works as expected.
    if (!isDirty && !editor.isComposing() && !editor._isPointerDown) {
      const key = resolvedTextNode.__key;
      const nodeDOM = getElementByKeyOrThrow(editor, key);
      if (getAdjustedSelectionOffset(nodeDOM) !== resolvedOffset) {
        isDirty = true;
      }
    }
    resolvedOffset = 0;
  }
  return [resolvedTextNode, resolvedOffset, isDirty];
}

function resolveSelectionNodesAndOffsets(
  anchorDOM: null | Node,
  anchorOffset: number,
  focusDOM: null | Node,
  focusOffset: number,
  editor: OutlineEditor,
): null | [TextNode, TextNode, number, number, boolean] {
  if (
    anchorDOM === null ||
    focusDOM === null ||
    !isSelectionWithinEditor(editor, anchorDOM, focusDOM)
  ) {
    return null;
  }
  let isDirty = false;
  const resolveAnchorNodeAndOffset = resolveSelectionNodeAndOffset(
    anchorDOM,
    anchorOffset,
    editor,
    isDirty,
  );
  if (resolveAnchorNodeAndOffset === null) {
    return null;
  }
  let resolvedAnchorNode = resolveAnchorNodeAndOffset[0];
  let resolvedAnchorOffset = resolveAnchorNodeAndOffset[1];
  isDirty = resolveAnchorNodeAndOffset[2];
  const resolveFocusNodeAndOffset = resolveSelectionNodeAndOffset(
    focusDOM,
    focusOffset,
    editor,
    isDirty,
  );
  if (resolveFocusNodeAndOffset === null) {
    return null;
  }
  let resolvedFocusNode = resolveFocusNodeAndOffset[0];
  let resolvedFocusOffset = resolveFocusNodeAndOffset[1];
  isDirty = resolveAnchorNodeAndOffset[2];

  // If the cursor is at the bounds and is also on an immutable
  // or segmented node, we can try and move the cursor to an
  // adjacent sibling.
  if (
    resolvedAnchorNode === resolvedFocusNode &&
    resolvedAnchorOffset === resolvedFocusOffset &&
    (resolvedAnchorNode.isImmutable() || resolvedAnchorNode.isSegmented())
  ) {
    const textContentSize = resolvedAnchorNode.getTextContentSize();
    const isAtStart = resolvedAnchorOffset === 0;
    const isAtBoundary = isAtStart || resolvedAnchorOffset === textContentSize;

    if (isAtBoundary) {
      const sibling = isAtStart
        ? resolvedAnchorNode.getPreviousSibling()
        : resolvedAnchorNode.getNextSibling();
      // Resolve the sibling
      if (isTextNode(sibling)) {
        const offset = isAtStart ? sibling.getTextContentSize() : 0;
        resolvedAnchorNode = sibling;
        resolvedFocusNode = sibling;
        resolvedAnchorOffset = offset;
        resolvedFocusOffset = offset;
        isDirty = true;
      }
    }
  }

  return [
    resolvedAnchorNode,
    resolvedFocusNode,
    resolvedAnchorOffset,
    resolvedFocusOffset,
    isDirty,
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
    anchorKey,
    anchorOffset,
    focusKey,
    focusOffset,
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
    eventType === 'compositionstart';
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (eventType === undefined || lastSelection === null || useDOMSelection) {
    const domSelection: WindowSelection = window.getSelection();
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  } else {
    return new Selection(
      lastSelection.anchorKey,
      lastSelection.anchorOffset,
      lastSelection.focusKey,
      lastSelection.focusOffset,
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
    isDirty,
  ] = resolvedSelectionNodesAndOffsets;

  const selection = new Selection(
    resolvedAnchorNode.__key,
    resolvedAnchorOffset,
    resolvedFocusNode.__key,
    resolvedFocusOffset,
  );
  // If the selection changes, we need to update our view model
  // regardless to keep the view in sync. If the selection is
  // already dirty, we don't need to bother with this, as we
  // will update the selection regardless.
  if (
    !isDirty &&
    lastSelection !== null &&
    isSelectionChange &&
    !isEqual(selection, lastSelection)
  ) {
    selection.needsSync = true;
  }
  if (isDirty) {
    selection.isDirty = true;
  }
  return selection;
}

function isEqual(selectionA: Selection, selectionB: Selection): boolean {
  return (
    selectionA.anchorKey === selectionB.anchorKey &&
    selectionA.focusKey === selectionB.focusKey &&
    selectionA.anchorOffset === selectionB.anchorOffset &&
    selectionA.focusOffset === selectionB.focusOffset
  );
}

export function getSelection(): null | Selection {
  const viewModel = getActiveViewModel();
  return viewModel._selection;
}

export function createSelectionFromParse(
  parsedSelection: null | {
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  },
): null | Selection {
  return parsedSelection === null
    ? null
    : new Selection(
        parsedSelection.anchorKey,
        parsedSelection.anchorOffset,
        parsedSelection.focusKey,
        parsedSelection.focusOffset,
      );
}
