/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode} from '.';
import type {
  IntentionallyMarkedAsDirtyElement,
  LexicalEditor,
} from './LexicalEditor';
import type {EditorState} from './LexicalEditorState';
import type {NodeKey, NodeMap} from './LexicalNode';

import {$isElementNode} from '.';
import {NodeMutation} from './LexicalEditor';
import {cloneDecorators} from './LexicalUtils';

export function $garbageCollectDetachedDecorators(
  editor: LexicalEditor,
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

function $garbageCollectDetachedDeepChildNodes(
  node: ElementNode,
  parentKey: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  dirtyNodes: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  mutatedNodes: Map<NodeKey, NodeMutation>,
): void {
  const children = node.__children;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const child = nodeMap.get(childKey);
    if (child !== undefined && child.__parent === parentKey) {
      if ($isElementNode(child)) {
        $garbageCollectDetachedDeepChildNodes(
          child,
          childKey,
          prevNodeMap,
          nodeMap,
          dirtyNodes,
          mutatedNodes,
        );
      }
      // If we have created a node and it was dereferenced, then also
      // remove it from out dirty nodes Set.
      if (!prevNodeMap.has(childKey)) {
        dirtyNodes.delete(childKey);
      }
      nodeMap.delete(childKey);
      mutatedNodes.set(childKey, NodeMutation.Detached);
    }
  }
}

export function $garbageCollectDetachedNodes(
  prevEditorState: EditorState,
  editorState: EditorState,
  dirtyLeaves: Set<NodeKey>,
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  mutatedNodes: Map<NodeKey, NodeMutation>,
): void {
  const dirtyLeavesArr = Array.from(dirtyLeaves);
  const dirtyLeavesLength = dirtyLeavesArr.length;
  const dirtyElementsArr = Array.from(dirtyElements);
  const dirtyElementsLength = dirtyElementsArr.length;
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
      mutatedNodes.set(nodeKey, NodeMutation.Detached);
    }
  }

  for (let i = 0; i < dirtyElementsLength; i++) {
    const nodeKey = dirtyElementsArr[i][0];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if ($isElementNode(node)) {
          $garbageCollectDetachedDeepChildNodes(
            node,
            nodeKey,
            prevNodeMap,
            nodeMap,
            dirtyElements,
            mutatedNodes,
          );
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyElements.delete(nodeKey);
        }
        nodeMap.delete(nodeKey);
        mutatedNodes.set(nodeKey, NodeMutation.Detached);
      }
    }
  }
}
