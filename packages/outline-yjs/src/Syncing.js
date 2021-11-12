/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  NodeKey,
  NodeMap,
  OutlineNode,
  OutlineEditor,
  NodeTypes,
} from 'outline';
import type {Binding, YjsNodeMap, ReverseYjsNodeMap} from '.';
// $FlowFixMe: need Flow typings for yjs
import {XmlElement, XmlText} from 'yjs';
import {isTextNode, isBlockNode} from 'outline';

const excludedProperties = new Set([
  '__key',
  '__children',
  '__parent',
  '__cachedText',
  '__text',
]);

// $FlowFixMe: todo
export type YjsNode = Object;
// $FlowFixMe: todo
export type YjsEvent = Object;

function createOutlineNodeFromYjsNode(
  yjsNode: YjsNode,
  parentKey: NodeKey,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
  nodeTypes: NodeTypes,
): NodeKey {
  const attributes = yjsNode.getAttributes();
  const nodeType = attributes.__type;
  const NodeType = nodeTypes.get(nodeType);
  if (NodeType === undefined) {
    throw new Error('createOutlineNodeFromYjsNode failed');
  }
  if (yjsNode instanceof XmlText) {
    attributes.__text = yjsNode.toJSON();
  }
  const node = NodeType.clone(attributes);
  const key = node.__key;
  node.__parent = parentKey;

  yjsNodeMap.set(key, yjsNode);
  reverseYjsNodeMap.set(yjsNode, key);

  if (isBlockNode(node)) {
    const childKeys = node.__children;
    let childYjsNode = yjsNode.firstChild;

    while (childYjsNode !== null) {
      childKeys.push(
        createOutlineNodeFromYjsNode(
          childYjsNode,
          key,
          yjsNodeMap,
          reverseYjsNodeMap,
          nodeTypes,
        ),
      );
      childYjsNode = childYjsNode.nextSibling;
    }
  }

  return key;
}

function createYjsNodeFromOutlineNode(
  key: NodeKey,
  node: OutlineNode,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
) {
  // We first validate that the parent exists
  const parent = node.getParentOrThrow();
  const parentKey = parent.getKey();
  const parentYjsElement = yjsNodeMap.get(parentKey);
  if (parentYjsElement === undefined) {
    createYjsNodeFromOutlineNode(
      parentKey,
      parent,
      yjsNodeMap,
      reverseYjsNodeMap,
    );
    return;
  }
  let yjsNode;

  if (isTextNode(node)) {
    const textContent = node.getTextContent();
    yjsNode = new XmlText();
    yjsNode.insert(0, textContent);
  } else {
    yjsNode = new XmlElement();
    yjsNode.nodeName = node.getType();
  }

  // Apply properties, except "key", ""
  const properties = Object.keys(node);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (!excludedProperties.has(property)) {
      // $FlowFixMe: intentional
      const value = node[property];
      yjsNode.setAttribute(property, value);
    }
  }

  yjsNodeMap.set(key, yjsNode);
  reverseYjsNodeMap.set(yjsNode, key);

  // Find the node we should insert this into
  const prevSibling = node.getPreviousSibling();
  if (prevSibling !== null) {
    const siblingKey = prevSibling.getKey();
    if (yjsNodeMap.get(siblingKey) === undefined) {
      // Let's create the sibling first
      createYjsNodeFromOutlineNode(
        siblingKey,
        prevSibling,
        yjsNodeMap,
        reverseYjsNodeMap,
      );
    }
    // TODO
    throw new Error('TODO');
  } else {
    parentYjsElement.insert(0, [yjsNode]);
  }
}

function syncOutlineNodeToYjs(
  key: NodeKey,
  nodeMap: NodeMap,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
): void {
  const node = nodeMap.get(key);
  if (node === undefined) {
    throw new Error('Should never happen');
  }
  const yjsNode = yjsNodeMap.get(key);
  if (yjsNode === undefined) {
    createYjsNodeFromOutlineNode(key, node, yjsNodeMap, reverseYjsNodeMap);
    return;
  }
  // Diff
  const attributes = yjsNode.getAttributes();
  const properties = Object.keys(node);

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (!excludedProperties.has(property)) {
      // $FlowFixMe: intentional
      const outlineValue = node[property];
      const yjsValue = attributes[property];
      if (yjsValue !== outlineValue) {
        yjsNode.setAttribute(property, outlineValue);
      }
    }
  }

  if (yjsNode instanceof XmlText && isTextNode(node)) {
    const yjsValue = yjsNode.toJSON();
    const outlineValue = node.__text;
    if (yjsValue !== outlineValue) {
      // TODO
      throw new Error('TODO');
    }
  }
}

export function syncOutlineUpdateToYjs(
  binding: Binding,
  prevEditorState: EditorState,
  currEditorState: EditorState,
  dirtyNodes: Set<NodeKey>,
): void {
  binding.doc.transact(() => {
    currEditorState.read((state) => {
      // Update nodes
      if (dirtyNodes.size > 0) {
        const nodeMap = currEditorState._nodeMap;
        const yjsNodeMap = binding.nodeMap;
        const reverseYjsNodeMap = binding.reverseNodeMap;
        const dirtyNodesArr = Array.from(dirtyNodes);
        for (let i = 0; i < dirtyNodesArr.length; i++) {
          const dirtyKey = dirtyNodesArr[i];
          syncOutlineNodeToYjs(
            dirtyKey,
            nodeMap,
            yjsNodeMap,
            reverseYjsNodeMap,
          );
        }
      }
      const prevSelection = prevEditorState._selection;
      const selection = state.getSelection();
      if (selection !== null && !selection.is(prevSelection)) {
        // TODO: update selection
      }
    });
  });
}

function syncYjsNodeToOutline(
  yjsNode: YjsNode,
  nodeMap: NodeMap,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
  childListChanged: boolean,
  attributesChanged: null | Set<string>,
  nodeTypes: NodeTypes,
): void {
  const key = reverseYjsNodeMap.get(yjsNode);
  if (key === undefined) {
    throw new Error('Should never happen');
  }
  const node = nodeMap.get(key);

  if (node === undefined) {
    // TODO
    throw new Error('TODO');
  }
  if (childListChanged && isBlockNode(node)) {
    const writableNode = node.getWritable();
    const childKeys = writableNode.__children;
    let index = 0;
    let childKey = childKeys[index];
    let childNode = nodeMap.get(childKey) || null;
    let childYjsNode = yjsNode.firstChild;

    while (childNode !== null || childYjsNode !== null) {
      if (childNode === null) {
        if (childYjsNode !== null) {
          // Create child
          childKey = createOutlineNodeFromYjsNode(
            childYjsNode,
            key,
            yjsNodeMap,
            reverseYjsNodeMap,
            nodeTypes,
          );
          childKeys[index] = childKey;
        }
      } else {
        if (childYjsNode === null) {
          // Remove child
          throw new Error('TODO');
        } else {
          // Update child
          syncYjsNodeToOutline(
            childYjsNode,
            nodeMap,
            yjsNodeMap,
            reverseYjsNodeMap,
            false,
            null,
            nodeTypes,
          );
        }
      }
      childYjsNode = childYjsNode.nextSibling;
      childKey = childKeys[++index];
      childNode = nodeMap.get(childKey) || null;
    }
  }
}

export function syncYjsChangesToOutline(
  binding: Binding,
  editor: OutlineEditor,
  events: Array<YjsEvent>,
): void {
  editor.update((state) => {
    const pendingEditorState = editor._pendingEditorState;
    if (pendingEditorState === null) {
      throw new Error('Not possible');
    }
    const currNodeMap = pendingEditorState._nodeMap;
    const yjsNodeMap = binding.nodeMap;
    const nodeTypes = editor._nodeTypes;
    const reverseYjsNodeMap = binding.reverseNodeMap;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const {target: yjsNode, childListChanged, attributesChanged} = event;
      syncYjsNodeToOutline(
        yjsNode,
        currNodeMap,
        yjsNodeMap,
        reverseYjsNodeMap,
        childListChanged,
        attributesChanged,
        nodeTypes,
      );
    }
  });
}
