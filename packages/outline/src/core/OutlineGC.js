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
import type {OutlineEditor} from './OutlineEditor';
import type {ViewModel} from './OutlineViewModel';

import {isBlockNode} from '.';
import {cloneDecorators} from './OutlineUtils';

export function garbageCollectDetachedDecorators(
  editor: OutlineEditor,
  pendingViewModel: ViewModel,
): void {
  const currentDecorators = editor._decorators;
  const pendingDecorators = editor._pendingDecorators;
  let decorators = pendingDecorators || currentDecorators;
  const nodeMap = pendingViewModel._nodeMap;
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
  nodeMap: NodeMap,
): void {
  const children = node.__children;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const child = nodeMap.get(childKey);
    if (child !== undefined && child.__parent === parentKey) {
      if (isBlockNode(child)) {
        garbageCollectDetachedDeepChildNodes(child, childKey, nodeMap);
      }
      nodeMap.delete(childKey);
    }
  }
}

export function garbageCollectDetachedNodes(
  viewModel: ViewModel,
  dirtyNodes: Set<NodeKey>,
  editor: OutlineEditor,
): void {
  const dirtyNodesArr = Array.from(dirtyNodes);
  const nodeMap = viewModel._nodeMap;

  for (let s = 0; s < dirtyNodesArr.length; s++) {
    const nodeKey = dirtyNodesArr[s];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if (isBlockNode(node)) {
          garbageCollectDetachedDeepChildNodes(node, nodeKey, nodeMap);
        }
        nodeMap.delete(nodeKey);
      }
    }
  }
}
