/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, View, Selection, OutlineEditor, NodeMap} from 'outline';

import {isBlockNode, isTextNode} from 'outline';
import invariant from 'shared/invariant';

type OffsetBlockNode = {
  type: 'block',
  child: null | OffsetNode,
  sibling: null | OffsetNode,
  start: number,
  end: number,
  key: NodeKey,
};

type OffsetTextNode = {
  type: 'text',
  child: null,
  sibling: null | OffsetNode,
  start: number,
  end: number,
  key: NodeKey,
};

type OffsetInlineNode = {
  type: 'inline',
  child: null,
  sibling: null | OffsetNode,
  start: number,
  end: number,
  key: NodeKey,
};

type OffsetNode = OffsetBlockNode | OffsetTextNode | OffsetInlineNode;

type OffsetMap = Map<NodeKey, OffsetNode>;

class OffsetView {
  _offsetMap: OffsetMap;
  _firstNode: null | OffsetNode;

  constructor(offsetMap: OffsetMap, firstNode: null | OffsetNode) {
    this._offsetMap = offsetMap;
    this._firstNode = firstNode;
  }

  createSelectionFromOffsets(
    view: View,
    start: number,
    end: number,
  ): null | Selection {
    const firstNode = this._firstNode;
    const selection = view.getSelection();
    if (firstNode === null || selection === null) {
      return null;
    }
    const isCollapsed = start === end;
    const startNode = searchForNodeWithOffset(firstNode, start, isCollapsed);
    const endNode = searchForNodeWithOffset(firstNode, end, isCollapsed);
    if (startNode === null || endNode === null) {
      return null;
    }
    let startKey = startNode.key;
    let endKey = endNode.key;
    let startOffset = 0;
    let endOffset = 0;
    let startType = 'block';
    let endType = 'block';

    if (startNode.type === 'text') {
      startOffset = start - startNode.start;
      startType = 'text';
    } else if (startNode.type === 'inline') {
      const node = view.getNodeByKey(startNode.key);
      if (node === null) {
        return null;
      }
      startKey = node.getParentOrThrow().getKey();
      startOffset = end > startNode.start ? startNode.end : startNode.start;
    }
    if (endNode.type === 'text') {
      endOffset = end - endNode.start;
      endType = 'text';
    } else if (endNode.type === 'inline') {
      const node = view.getNodeByKey(endNode.key);
      if (node === null) {
        return null;
      }
      endKey = node.getParentOrThrow().getKey();
      endOffset = end > endNode.start ? endNode.end : endNode.start;
    }
    const newSelection = selection.clone();
    newSelection.anchor.set(startKey, startOffset, startType);
    newSelection.focus.set(endKey, endOffset, endType);
    return newSelection;
  }

  getOffsetsFromSelection(selection: Selection): [number, number] {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const offsetMap = this._offsetMap;
    const anchorOffset = anchor.offset;
    const focusOffset = focus.offset;
    let start = -1;
    let end = -1;

    if (anchor.type === 'text') {
      const offsetNode = offsetMap.get(anchor.key);
      if (offsetNode !== undefined) {
        start = offsetNode.start + anchorOffset;
      }
    } else {
      const node = anchor.getNode().getDescendantByIndex(anchorOffset);
      const offsetNode = offsetMap.get(node.getKey());
      if (offsetNode !== undefined) {
        const isAtEnd = node.getIndexWithinParent() !== anchorOffset;
        start = isAtEnd ? offsetNode.end : offsetNode.start;
      }
    }
    if (focus.type === 'text') {
      const offsetNode = offsetMap.get(focus.key);
      if (offsetNode !== undefined) {
        end = offsetNode.start + focus.offset;
      }
    } else {
      const node = focus.getNode().getDescendantByIndex(focusOffset);
      const offsetNode = offsetMap.get(node.getKey());
      if (offsetNode !== undefined) {
        const isAtEnd = node.getIndexWithinParent() !== focusOffset;
        end = isAtEnd ? offsetNode.end : offsetNode.start;
      }
    }
    return [start, end];
  }
}

function searchForNodeWithOffset(
  firstNode: OffsetNode,
  offset: number,
  isCollapsed: boolean,
): OffsetNode | null {
  let currentNode = firstNode;
  while (currentNode !== null) {
    const end = currentNode.end + (isCollapsed ? 1 : 0);
    if (offset < end) {
      const child = currentNode.child;
      if (child !== null) {
        currentNode = child;
        continue;
      }
      return currentNode;
    }
    const sibling = currentNode.sibling;
    if (sibling !== null) {
      currentNode = sibling;
      continue;
    }
    currentNode = currentNode.sibling;
  }
  return null;
}

function createInternalOffsetNode<N>(
  child: null | OffsetNode,
  type: 'block' | 'text' | 'inline',
  start: number,
  end: number,
  key: NodeKey,
): N {
  // $FlowFixMe: not sure why Flow doesn't like this?
  return {
    child,
    sibling: null,
    type,
    start,
    end,
    key,
  };
}

function createOffsetNode(
  state: {offset: number, prevIsBlock: boolean},
  key: NodeKey,
  nodeMap: NodeMap,
  offsetMap: OffsetMap,
): OffsetNode {
  const node = nodeMap.get(key);
  if (node === undefined) {
    invariant(false, 'createOffsetModel: could not find node by key');
  }
  const start = state.offset;

  if (isBlockNode(node)) {
    const childKeys = node.__children;
    const blockIsEmpty = childKeys.length === 0;
    const child = blockIsEmpty
      ? null
      : createOffsetChild(state, childKeys, nodeMap, offsetMap);
    // If the prev node was not a block or the block is empty, we should
    // account for the user being able to selection the block (due to the \n).
    if (!state.prevIsBlock || blockIsEmpty) {
      state.prevIsBlock = true;
      state.offset++;
    }
    const end = state.offset;
    const offsetNode = createInternalOffsetNode(
      child,
      'block',
      start,
      end,
      key,
    );
    offsetMap.set(key, offsetNode);
    return offsetNode;
  }
  state.prevIsBlock = false;
  const isText = isTextNode(node);
  // Inlines are always a single character
  // $FlowFixMe: isText means __text is available
  const length = isText ? node.__text.length : 1;
  const end = (state.offset += length);

  const offsetNode: OffsetTextNode | OffsetInlineNode =
    createInternalOffsetNode<OffsetTextNode | OffsetInlineNode>(
      null,
      isText ? 'text' : 'inline',
      start,
      end,
      key,
    );
  offsetMap.set(key, offsetNode);
  return offsetNode;
}

function createOffsetChild(
  state: {offset: number, prevIsBlock: boolean},
  children: Array<NodeKey>,
  nodeMap: NodeMap,
  offsetMap: OffsetMap,
): OffsetNode | null {
  let firstNode = null;
  let currentNode = null;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const offsetNode = createOffsetNode(state, childKey, nodeMap, offsetMap);
    if (currentNode === null) {
      firstNode = offsetNode;
    } else {
      currentNode.sibling = offsetNode;
    }
    currentNode = offsetNode;
  }
  return firstNode;
}

export function createOffsetView(editor: OutlineEditor): OffsetView {
  const viewModel = editor._pendingViewModel || editor._viewModel;
  const nodeMap = viewModel._nodeMap;
  // $FlowFixMe: root is always in the Map
  const root = ((nodeMap.get('root'): any): RootNode);
  const offsetMap = new Map();
  const state = {offset: 0, prevIsBlock: false};
  const node = createOffsetChild(state, root.__children, nodeMap, offsetMap);
  return new OffsetView(offsetMap, node);
}
