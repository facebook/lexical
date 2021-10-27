/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  TextNodeTransform,
  ListenerType,
} from './OutlineEditor';
import type {NodeKey, NodeMap} from './OutlineNode';
import {getCompositionKey} from './OutlineUtils';
import {view} from './OutlineUpdates';
import {isTextNode, isLineBreakNode} from '.';

export function triggerTextMutationListeners(
  nodeMap: NodeMap,
  dirtyNodes: Array<NodeKey>,
  transforms: Array<TextNodeTransform>,
): void {
  const compositionKey = getCompositionKey();
  for (let s = 0; s < dirtyNodes.length; s++) {
    const nodeKey = dirtyNodes[s];

    const node = nodeMap.get(nodeKey);

    if (
      node !== undefined &&
      isTextNode(node) &&
      // We don't want to transform nodes being composed
      node.__key !== compositionKey &&
      !isLineBreakNode(node) &&
      node.isAttached() &&
      // You shouldn't be able to transform these types of
      // nodes.
      !node.isImmutable() &&
      !node.isSegmented()
    ) {
      // Apply text transforms
      for (let i = 0; i < transforms.length; i++) {
        transforms[i](node, view);
        if (!node.isAttached()) {
          break;
        }
      }
    }
  }
}

export function triggerListeners(
  type: ListenerType,
  editor: OutlineEditor,
  // $FlowFixMe: needs refining
  ...payload: Array<any>
): void {
  const listeners = Array.from(editor._listeners[type]);
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](...payload);
  }
}
