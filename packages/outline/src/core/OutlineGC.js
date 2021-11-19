/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMap} from './OutlineNode';
import type {BlockNode} from './OutlineBlockNode';
import type {
  IntentionallyMarkedAsDirtyBlock,
  OutlineEditor,
} from './OutlineEditor';
import type {EditorState} from './OutlineEditorState';

import {isBlockNode} from '.';
import {cloneDecorators} from './OutlineUtils';

export function garbageCollectDetachedDecorators(
  editor: OutlineEditor,
  pendingEditorState: EditorState,
): void {
  const currentDecorators = editor._decorators;
  const pendingDecorators = editor._pendingDecorators;
  let decorators = pendingDecorators || currentDecorators;
  const nodeMap = pendingEditorState._nodeMap;
  let key;
  for (key in decorators) {
    if (!nodeMap.has(key)) {
      if (decorators === currentDecorators) {
        decorators = cloneDecorators(editor);
      }
      delete decorators[key];
    }
  }
}

function garbageCollectDetachedDeepChildNodes(
  node: BlockNode,
  parentKey: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  dirtyNodes: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
): void {
  const children = node.__children;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const child = nodeMap.get(childKey);
    if (child !== undefined && child.__parent === parentKey) {
      if (isBlockNode(child)) {
        garbageCollectDetachedDeepChildNodes(
          child,
          childKey,
          prevNodeMap,
          nodeMap,
          dirtyNodes,
        );
      }
      // If we have created a node and it was dereferenced, then also
      // remove it from out dirty nodes Set.
      if (!prevNodeMap.has(childKey)) {
        dirtyNodes.delete(childKey);
      }
      nodeMap.delete(childKey);
    }
  }
}

export function garbageCollectDetachedNodes(
  prevEditorState: EditorState,
  editorState: EditorState,
  dirtyLeaves: Set<NodeKey>,
  dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
  editor: OutlineEditor,
): void {
  const dirtyLeavesArr = Array.from(dirtyLeaves);
  const dirtyLeavesLength = dirtyLeavesArr.length;
  const dirtyBlocksArr = Array.from(dirtyBlocks);
  const dirtyBlocksLength = dirtyBlocksArr.length;
  const prevNodeMap = prevEditorState._nodeMap;
  const nodeMap = editorState._nodeMap;

  for (let i = 0; i < dirtyLeavesLength; i++) {
    const nodeKey = dirtyLeavesArr[i];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined && !node.isAttached()) {
      if (!prevNodeMap.has(nodeKey)) {
        dirtyLeaves.delete(nodeKey);
      }
      nodeMap.delete(nodeKey);
    }
  }

  for (let i = 0; i < dirtyBlocksLength; i++) {
    const nodeKey = dirtyBlocksArr[i][0];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if (isBlockNode(node)) {
          garbageCollectDetachedDeepChildNodes(
            node,
            nodeKey,
            prevNodeMap,
            nodeMap,
            dirtyBlocks,
          );
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyBlocks.delete(nodeKey);
        }
        nodeMap.delete(nodeKey);
      }
    }
  }
}
