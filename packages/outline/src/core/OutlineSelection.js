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
import {getNodeKeyFromDOM} from './OutlineReconciler';
import {getNodeByKey} from './OutlineNode';
import {isTextNode, isBlockNode, isLineBreakNode, TextNode} from '.';
import {
  isImmutableOrInertOrSegmented,
  isSelectionWithinEditor,
} from './OutlineUtils';
import {OutlineEditor} from './OutlineEditor';
import invariant from 'shared/invariant';

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

function resolveNonLineBreakOrInertNode(
  node: TextNode,
): [TextNode, number, boolean] {
  const resolvedNode = node.getPreviousSibling();
  if (!isTextNode(resolvedNode)) {
    invariant(
      false,
      'resolveNonLineBreakOrInertNode: resolved node not a text node',
    );
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
  let didResolveOffsetAlready = false;
  // If we have selection on an element, we will
  // need to figure out (using the offset) what text
  // node should be selected.

  if (domIsElement(resolvedDOM) && resolvedDOM.nodeName !== 'BR') {
    didResolveOffsetAlready = true;
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
  if (
    isLineBreakNode(resolvedNode) ||
    (isTextNode(resolvedNode) && resolvedNode.isInert())
  ) {
    return resolveNonLineBreakOrInertNode(resolvedNode);
  }
  if (!isTextNode(resolvedNode)) {
    return null;
  }
  let resolvedTextNode = resolvedNode;

  if (isImmutableOrInertOrSegmented(resolvedTextNode)) {
    if (window.getSelection().isCollapsed) {
      if (resolvedOffset === 0) {
        const prevSibling = resolvedTextNode.getPreviousSibling();
        if (isTextNode(prevSibling)) {
          resolvedTextNode = prevSibling;
          resolvedOffset = prevSibling.getTextContentSize();
          isDirty = true;
        }
      }
    }
  } else {
    // Because we use a special character for whitespace
    // at the start of all strings, we need to remove one
    // from the offset.
    if (resolvedOffset === 0) {
      isDirty = true;
    } else if (!didResolveOffsetAlready) {
      resolvedOffset--;
    }
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
  const resolvedAnchorNode = resolveAnchorNodeAndOffset[0];
  const resolvedAnchorOffset = resolveAnchorNodeAndOffset[1];
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
  const resolvedFocusNode = resolveFocusNodeAndOffset[0];
  const resolvedFocusOffset = resolveFocusNodeAndOffset[1];
  isDirty = resolveFocusNodeAndOffset[2];

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

  const selectionsMatch =
    lastSelection !== null && isEqual(selection, lastSelection);

  if (isDirty) {
    // If the selection hasn't changed then don't add the isDirty flag.
    // This will avoid recursive updates occurring because we keep
    // adding isDirty.
    if (!selectionsMatch) {
      selection.isDirty = true;
    }
  } else if (isSelectionChange && !selectionsMatch) {
    // If the selection changes, we need to update our view model
    // regardless to keep the view in sync. If the selection is
    // already dirty, we don't need to bother with this, as we
    // will update the selection regardless.
    selection.needsSync = true;
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
