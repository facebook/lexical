/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, NodeMap} from './OutlineNode';
import type {ElementNode} from './OutlineElementNode';
import type {
  IntentionallyMarkedAsDirtyElement,
  OutlineEditor,
} from './OutlineEditor';
import type {EditorState} from './OutlineEditorState';

import {$isElementNode} from '.';
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
  node: ElementNode,
  parentKey: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  dirtyNodes: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
): void {
  const children = node.__children;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const child = nodeMap.get(childKey);
    if (child !== undefined && child.__parent === parentKey) {
      if ($isElementNode(child)) {
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
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
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
    }
  }

  for (let i = 0; i < dirtyElementsLength; i++) {
    const nodeKey = dirtyElementsArr[i][0];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if ($isElementNode(node)) {
          garbageCollectDetachedDeepChildNodes(
            node,
            nodeKey,
            prevNodeMap,
            nodeMap,
            dirtyElements,
          );
        }
        // If we have created a node and it was dereferenced, then also
        // remove it from out dirty nodes Set.
        if (!prevNodeMap.has(nodeKey)) {
          dirtyElements.delete(nodeKey);
        }
        nodeMap.delete(nodeKey);
      }
    }
  }
}
