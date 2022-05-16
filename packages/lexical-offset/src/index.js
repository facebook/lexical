/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  LexicalEditor,
  NodeKey,
  NodeMap,
  RangeSelection,
} from 'lexical';

import {
  $createRangeSelection,
  $getNodeByKey,
  $isElementNode,
  $isTextNode,
} from 'lexical';
import invariant from 'shared/invariant';

type OffsetElementNode = {
  child: null | OffsetNode,
  end: number,
  key: NodeKey,
  next: null | OffsetNode,
  parent: null | OffsetElementNode,
  prev: null | OffsetNode,
  start: number,
  type: 'element',
};

type OffsetTextNode = {
  child: null,
  end: number,
  key: NodeKey,
  next: null | OffsetNode,
  parent: null | OffsetElementNode,
  prev: null | OffsetNode,
  start: number,
  type: 'text',
};

type OffsetInlineNode = {
  child: null,
  end: number,
  key: NodeKey,
  next: null | OffsetNode,
  parent: null | OffsetElementNode,
  prev: null | OffsetNode,
  start: number,
  type: 'inline',
};

type OffsetNode = OffsetElementNode | OffsetTextNode | OffsetInlineNode;

type OffsetMap = Map<NodeKey, OffsetNode>;

export class OffsetView {
  _offsetMap: OffsetMap;
  _firstNode: null | OffsetNode;
  _blockOffsetSize: number;

  constructor(
    offsetMap: OffsetMap,
    firstNode: null | OffsetNode,
    blockOffsetSize: number = 1,
  ): void {
    this._offsetMap = offsetMap;
    this._firstNode = firstNode;
    this._blockOffsetSize = blockOffsetSize;
  }

  createSelectionFromOffsets(
    originalStart: number,
    originalEnd: number,
    diffOffsetView?: OffsetView,
  ): null | RangeSelection {
    const firstNode = this._firstNode;
    if (firstNode === null) {
      return null;
    }
    let start = originalStart;
    let end = originalEnd;
    let startOffsetNode = $searchForNodeWithOffset(
      firstNode,
      start,
      this._blockOffsetSize,
    );
    let endOffsetNode = $searchForNodeWithOffset(
      firstNode,
      end,
      this._blockOffsetSize,
    );
    if (diffOffsetView !== undefined) {
      start = $getAdjustedOffsetFromDiff(
        start,
        startOffsetNode,
        diffOffsetView,
        this,
        this._blockOffsetSize,
      );
      startOffsetNode = $searchForNodeWithOffset(
        firstNode,
        start,
        this._blockOffsetSize,
      );
      end = $getAdjustedOffsetFromDiff(
        end,
        endOffsetNode,
        diffOffsetView,
        this,
        this._blockOffsetSize,
      );
      endOffsetNode = $searchForNodeWithOffset(
        firstNode,
        end,
        this._blockOffsetSize,
      );
    }
    if (startOffsetNode === null || endOffsetNode === null) {
      return null;
    }

    let startKey = startOffsetNode.key;
    let endKey = endOffsetNode.key;
    const startNode = $getNodeByKey(startKey);
    const endNode = $getNodeByKey(endKey);
    if (startNode === null || endNode === null) {
      return null;
    }
    let startOffset = 0;
    let endOffset = 0;
    let startType = 'element';
    let endType = 'element';

    if (startOffsetNode.type === 'text') {
      startOffset = start - startOffsetNode.start;
      startType = 'text';
      // If we are at the edge of a text node and we
      // don't have a collapsed selection, then let's
      // try and correct the offset node.
      const sibling = startNode.getNextSibling();
      if (
        start !== end &&
        startOffset === startNode.getTextContentSize() &&
        $isTextNode(sibling)
      ) {
        startOffset = 0;
        startKey = sibling.__key;
      }
    } else if (startOffsetNode.type === 'inline') {
      startKey = startNode.getParentOrThrow().getKey();
      startOffset =
        end > startOffsetNode.start
          ? startOffsetNode.end
          : startOffsetNode.start;
    }
    if (endOffsetNode.type === 'text') {
      endOffset = end - endOffsetNode.start;
      endType = 'text';
    } else if (endOffsetNode.type === 'inline') {
      endKey = endNode.getParentOrThrow().getKey();
      endOffset =
        end > endOffsetNode.start ? endOffsetNode.end : endOffsetNode.start;
    }
    const selection = $createRangeSelection();
    if (selection === null) {
      return null;
    }
    selection.anchor.set(startKey, startOffset, startType);
    selection.focus.set(endKey, endOffset, endType);
    return selection;
  }

  getOffsetsFromSelection(selection: RangeSelection): [number, number] {
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
      if (node !== null) {
        const offsetNode = offsetMap.get(node.getKey());
        if (offsetNode !== undefined) {
          const isAtEnd = node.getIndexWithinParent() !== anchorOffset;
          start = isAtEnd ? offsetNode.end : offsetNode.start;
        }
      }
    }
    if (focus.type === 'text') {
      const offsetNode = offsetMap.get(focus.key);
      if (offsetNode !== undefined) {
        end = offsetNode.start + focus.offset;
      }
    } else {
      const node = focus.getNode().getDescendantByIndex(focusOffset);
      if (node !== null) {
        const offsetNode = offsetMap.get(node.getKey());
        if (offsetNode !== undefined) {
          const isAtEnd = node.getIndexWithinParent() !== focusOffset;
          end = isAtEnd ? offsetNode.end : offsetNode.start;
        }
      }
    }
    return [start, end];
  }
}

function $getAdjustedOffsetFromDiff(
  offset: number,
  offsetNode: null | OffsetNode,
  prevOffsetView: OffsetView,
  offsetView: OffsetView,
  blockOffsetSize: number,
): number {
  const prevOffsetMap = prevOffsetView._offsetMap;
  const offsetMap = offsetView._offsetMap;
  const visited = new Set();
  let adjustedOffset = offset;
  let currentNode = offsetNode;

  while (currentNode !== null) {
    const key = currentNode.key;
    const prevNode = prevOffsetMap.get(key);
    const diff = currentNode.end - currentNode.start;

    visited.add(key);
    if (prevNode === undefined) {
      adjustedOffset += diff;
    } else {
      const prevDiff = prevNode.end - prevNode.start;

      if (prevDiff !== diff) {
        adjustedOffset += diff - prevDiff;
      }
    }
    const sibling = currentNode.prev;
    if (sibling !== null) {
      currentNode = sibling;
      continue;
    }
    let parent = currentNode.parent;
    while (parent !== null) {
      let parentSibling = parent.prev;
      if (parentSibling !== null) {
        const parentSiblingKey = parentSibling.key;
        const prevParentSibling = prevOffsetMap.get(parentSiblingKey);
        const parentDiff = parentSibling.end - parentSibling.start;

        visited.add(parentSiblingKey);
        if (prevParentSibling === undefined) {
          adjustedOffset += parentDiff;
        } else {
          const prevParentDiff =
            prevParentSibling.end - prevParentSibling.start;
          if (prevParentDiff !== parentDiff) {
            adjustedOffset += parentDiff - prevParentDiff;
          }
        }
        parentSibling = parentSibling.prev;
      }
      parent = parent.parent;
    }
    break;
  }
  // Now traverse through the old offsets nodes and find any nodes we missed
  // above, because they were not in the latest offset node view (they have been
  // deleted).
  const prevFirstNode = prevOffsetView._firstNode;
  if (prevFirstNode !== null) {
    currentNode = $searchForNodeWithOffset(
      prevFirstNode,
      offset,
      blockOffsetSize,
    );
    let alreadyVisistedParentOfCurrentNode = false;
    while (currentNode !== null) {
      if (!visited.has(currentNode.key)) {
        alreadyVisistedParentOfCurrentNode = true;
        break;
      }
      currentNode = currentNode.parent;
    }
    if (!alreadyVisistedParentOfCurrentNode) {
      while (currentNode !== null) {
        const key = currentNode.key;
        if (!visited.has(key)) {
          const node = offsetMap.get(key);
          const prevDiff = currentNode.end - currentNode.start;

          if (node === undefined) {
            adjustedOffset -= prevDiff;
          } else {
            const diff = node.end - node.start;
            if (prevDiff !== diff) {
              adjustedOffset += diff - prevDiff;
            }
          }
        }
        currentNode = currentNode.prev;
      }
    }
  }
  return adjustedOffset;
}

function $searchForNodeWithOffset(
  firstNode: OffsetNode,
  offset: number,
  blockOffsetSize: number,
): OffsetNode | null {
  let currentNode = firstNode;
  while (currentNode !== null) {
    const end =
      currentNode.end +
      (currentNode.type !== 'element' || blockOffsetSize === 0 ? 1 : 0);
    if (offset < end) {
      const child = currentNode.child;
      if (child !== null) {
        currentNode = child;
        continue;
      }
      return currentNode;
    }
    const sibling = currentNode.next;
    if (sibling === null) {
      break;
    }
    currentNode = sibling;
  }
  return null;
}

function $createInternalOffsetNode<N>(
  child: null | OffsetNode,
  type: 'element' | 'text' | 'inline',
  start: number,
  end: number,
  key: NodeKey,
  parent: null | OffsetElementNode,
): N {
  // $FlowFixMe: not sure why Flow doesn't like this?
  return {
    child,
    end,
    key,
    next: null,
    parent,
    prev: null,
    start,
    type,
  };
}

function $createOffsetNode(
  state: {offset: number, prevIsBlock: boolean},
  key: NodeKey,
  parent: null | OffsetElementNode,
  nodeMap: NodeMap,
  offsetMap: OffsetMap,
  blockOffsetSize: number,
): OffsetNode {
  const node = nodeMap.get(key);
  if (node === undefined) {
    invariant(false, 'createOffsetModel: could not find node by key');
  }
  const start = state.offset;

  if ($isElementNode(node)) {
    const childKeys = node.__children;
    const blockIsEmpty = childKeys.length === 0;

    const child = blockIsEmpty
      ? null
      : $createOffsetChild(
          state,
          childKeys,
          null,
          nodeMap,
          offsetMap,
          blockOffsetSize,
        );
    // If the prev node was not a block or the block is empty, we should
    // account for the user being able to selection the block (due to the \n).
    if (!state.prevIsBlock || blockIsEmpty) {
      state.prevIsBlock = true;
      state.offset += blockOffsetSize;
    }
    const offsetNode = $createInternalOffsetNode<OffsetElementNode>(
      child,
      'element',
      start,
      start,
      key,
      parent,
    );
    if (child !== null) {
      child.parent = offsetNode;
    }
    const end = state.offset;
    offsetNode.end = end;
    offsetMap.set(key, offsetNode);
    return offsetNode;
  }
  state.prevIsBlock = false;
  const isText = $isTextNode(node);
  // $FlowFixMe: isText means __text is available
  const length = isText ? node.__text.length : 1;
  const end = (state.offset += length);

  const offsetNode: OffsetTextNode | OffsetInlineNode =
    $createInternalOffsetNode<OffsetTextNode | OffsetInlineNode>(
      null,
      isText ? 'text' : 'inline',
      start,
      end,
      key,
      parent,
    );
  offsetMap.set(key, offsetNode);
  return offsetNode;
}

function $createOffsetChild(
  state: {offset: number, prevIsBlock: boolean},
  children: Array<NodeKey>,
  parent: null | OffsetElementNode,
  nodeMap: NodeMap,
  offsetMap: OffsetMap,
  blockOffsetSize: number,
): OffsetNode | null {
  let firstNode = null;
  let currentNode = null;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const offsetNode = $createOffsetNode(
      state,
      childKey,
      parent,
      nodeMap,
      offsetMap,
      blockOffsetSize,
    );
    if (currentNode === null) {
      firstNode = offsetNode;
    } else {
      offsetNode.prev = currentNode;
      currentNode.next = offsetNode;
    }
    currentNode = offsetNode;
  }
  return firstNode;
}

export function $createOffsetView(
  editor: LexicalEditor,
  blockOffsetSize?: number = 1,
  editorState?: EditorState,
): OffsetView {
  const targetEditorState =
    editorState || editor._pendingEditorState || editor._editorState;
  const nodeMap = targetEditorState._nodeMap;
  // $FlowFixMe: root is always in the Map
  const root = ((nodeMap.get('root'): any): RootNode);
  const offsetMap = new Map();
  const state = {offset: 0, prevIsBlock: false};
  const node = $createOffsetChild(
    state,
    root.__children,
    null,
    nodeMap,
    offsetMap,
    blockOffsetSize,
  );
  return new OffsetView(offsetMap, node, blockOffsetSize);
}
