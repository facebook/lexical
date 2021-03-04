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
import {BlockNode, TextNode} from '.';
import {invariant} from './OutlineUtils';
import {OutlineEditor} from './OutlineEditor';

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
    const anchorNode = getNodeByKey(anchorKey);
    if (!(anchorNode instanceof TextNode)) {
      if (__DEV__) {
        invariant(false, 'getAnchorNode: anchorNode not a text node');
      } else {
        invariant();
      }
    }
    return anchorNode;
  }
  getFocusNode(): TextNode {
    const focusKey = this.focusKey;
    const focusNode = getNodeByKey(focusKey);
    if (!(focusNode instanceof TextNode)) {
      if (__DEV__) {
        invariant(false, 'getFocusNode: focusNode not a text node');
      } else {
        invariant();
      }
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
    let textContent = '';
    nodes.forEach((node) => {
      if (node instanceof TextNode) {
        textContent += node.getTextContent();
      }
    });
    return textContent;
  }
  applyDOMRange(domRange: {
    collapsed: boolean,
    startContainer: Node,
    endContainer: Node,
    startOffset: number,
    endOffset: number,
  }): void {
    const editor = getActiveEditor();
    const resolution = resolveSelectionNodes(
      domRange.startContainer,
      domRange.endContainer,
      domRange.startOffset,
      domRange.endOffset,
      editor,
    );
    if (resolution === null) {
      return;
    }
    const [anchorNode, focusNode, anchorOffset, focusOffset] = resolution;
    this.anchorKey = anchorNode.__key;
    this.focusKey = focusNode.__key;
    this.anchorOffset = anchorOffset;
    this.focusOffset = focusOffset;
  }
}

function resolveSelectionNodes(
  anchorDOM: Node,
  focusDOM: Node,
  anchorOffset: number,
  focusOffset: number,
  editor: OutlineEditor,
): null | [TextNode, TextNode, number, number, boolean] {
  const viewModel = getActiveViewModel();
  const nodeMap = viewModel._nodeMap;
  const root = nodeMap.root;
  const editorElement = editor.getEditorElement();
  let anchorNode;
  let focusNode;
  let resolvedAnchorOffset = anchorOffset;
  let resolvedFocusOffset = focusOffset;
  let isDirty = false;

  if (
    editorElement === null ||
    !editorElement.contains(anchorDOM) ||
    !editorElement.contains(focusDOM)
  ) {
    return null;
  }
  // If we're given the element nodes, lets try and work out what
  // text nodes we can use instead. Otherwise, return null.
  if (anchorDOM === editorElement) {
    anchorNode = root.getFirstTextNode();
    resolvedAnchorOffset = 0;
  } else {
    const anchorKey = getNodeKeyFromDOM(anchorDOM);
    if (anchorKey) {
      anchorNode = nodeMap[anchorKey];
    }
  }
  if (focusDOM === editorElement) {
    focusNode = root.getLastTextNode();
    if (focusNode !== null) {
      resolvedFocusOffset = focusNode.getTextContent().length;
    }
  } else {
    const focusKey = getNodeKeyFromDOM(focusDOM);
    if (focusKey) {
      focusNode = nodeMap[focusKey];
    }
  }
  // We try and find the relevant text nodes from the selection.
  // If we can't do this, we return null.
  if (anchorNode == null || focusNode == null) {
    return null;
  }
  if (focusNode instanceof BlockNode) {
    focusNode = focusNode.getLastTextNode();
    if (focusNode !== null) {
      resolvedFocusOffset = focusNode.getTextContent().length;
    }
  }
  if (anchorOffset !== focusOffset) {
    if (anchorNode instanceof BlockNode) {
      anchorNode = anchorNode.getFirstTextNode();
      resolvedAnchorOffset = 0;
    }
  } else {
    anchorNode = focusNode;
    resolvedAnchorOffset = resolvedFocusOffset;
  }
  if (!(anchorNode instanceof TextNode && focusNode instanceof TextNode)) {
    if (__DEV__) {
      invariant(false, 'Should never happen');
    } else {
      invariant();
    }
  }
  // Because we use a special character for whitespace,
  // we need to adjust offsets to 0 when the text is
  // really empty.
  if (anchorNode.__text === '') {
    // When dealing with empty text nodes, we always
    // render a special empty space character, and set
    // the native DOM selection to offset 1 so that
    // text entry works as expected.
    if (
      anchorNode === focusNode &&
      anchorOffset !== 1 &&
      !editor.isComposing() &&
      !editor.isPointerDown()
    ) {
      isDirty = true;
    }
    resolvedAnchorOffset = 0;
  }
  if (focusNode.__text === '') {
    resolvedFocusOffset = 0;
  }
  return [
    anchorNode,
    focusNode,
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
  const isComposing = eventType === 'compositionstart';
  const isSelectionChange = eventType === 'selectionchange';
  const useDOMSelection = isSelectionChange || eventType === 'beforeinput';
  let anchorDOM, focusDOM, anchorOffset, focusOffset;

  if (
    eventType === undefined ||
    lastSelection === null ||
    useDOMSelection ||
    (isComposing && editor.isKeyDown())
  ) {
    const domSelection: WindowSelection = window.getSelection();
    anchorDOM = domSelection.anchorNode;
    focusDOM = domSelection.focusNode;
    anchorOffset = domSelection.anchorOffset;
    focusOffset = domSelection.focusOffset;
  } else {
    const selection = new Selection(
      lastSelection.anchorKey,
      lastSelection.anchorOffset,
      lastSelection.focusKey,
      lastSelection.focusOffset,
    );
    if (isComposing) {
      selection.isDirty = true;
    }
    return selection;
  }
  if (editor === null || anchorDOM === null || focusDOM === null) {
    return null;
  }
  // Let's resolve the nodes, in the case we're selecting block nodes.
  // We always to make sure the anchor and focus nodes are text nodes.
  const resolution = resolveSelectionNodes(
    anchorDOM,
    focusDOM,
    anchorOffset,
    focusOffset,
    editor,
  );
  if (resolution === null) {
    return null;
  }
  const [
    resolvedAnchorNode,
    resolvedFocusNode,
    resolvedAnchorOffset,
    resolvedFocusOffset,
    isDirty,
  ] = resolution;

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
