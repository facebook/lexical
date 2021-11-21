/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  NodeKey,
  EditorState,
  Selection,
  NodeMap,
  OutlineNode,
  BlockNode,
} from 'outline';
import type {Provider, Binding, YjsNode} from '.';

// $FlowFixMe: need Flow typings for yjs
import {XmlText, XmlElement, Doc} from 'yjs';
import {isTextNode, isBlockNode, isDecoratorNode, getSelection} from 'outline';
import {
  diffText,
  getIndexOfYjsNode,
  spliceYjsText,
  registerYjsNode,
} from './Utils';
import {syncOutlineSelectionToYjs} from './SyncCursors';

const excludedProperties = new Set([
  '__key',
  '__children',
  '__parent',
  '__cachedText',
  '__text',
  '__ref',
]);

function removeYjsNode(
  binding: Binding,
  key: NodeKey,
  yjsNode: YjsNode,
  node: OutlineNode,
  nodeMap: NodeMap,
): void {
  const yjsNodeMap = binding.nodeMap;
  const reverseYjsNodeMap = binding.reverseNodeMap;
  yjsNodeMap.delete(key);
  reverseYjsNodeMap.delete(yjsNode);
  // Node has been deleted
  const parentKey = node.__parent || '';
  const parentNode = nodeMap.get(parentKey);
  if (parentNode === undefined) {
    // If we don't have a parent, this node is already
    // deleted
    return;
  }
  const yjsParentNode = yjsNode.parent;
  const index = getIndexOfYjsNode(yjsParentNode, yjsNode);
  if (index !== -1) {
    yjsParentNode.delete(index, 1);
  }
}

function appendYjsNode(
  binding: Binding,
  yjsNode: YjsNode,
  node: OutlineNode,
  parentYjsNode: YjsNode,
): void {
  const yjsNodeMap = binding.nodeMap;
  const prevSibling = node.getPreviousSibling();
  if (prevSibling !== null) {
    const siblingKey = prevSibling.getKey();
    let siblingYjsNode = yjsNodeMap.get(siblingKey);
    if (siblingYjsNode === undefined) {
      // Let's create the sibling first
      siblingYjsNode = createYjsNodeFromOutlineNode(
        binding,
        siblingKey,
        prevSibling,
      );
    }
  }
  const index = node.getIndexWithinParent();
  parentYjsNode.insert(index, [yjsNode]);
}

function createYjsNodeFromOutlineNode(
  binding: Binding,
  key: NodeKey,
  node: OutlineNode,
): YjsNode {
  // We first validate that the parent exists
  const yjsNodeMap = binding.nodeMap;
  const parent = node.getParentOrThrow();
  const parentKey = parent.getKey();
  let parentYjsNode = yjsNodeMap.get(parentKey);
  if (parentYjsNode === undefined) {
    parentYjsNode = createYjsNodeFromOutlineNode(binding, parentKey, parent);
  }
  let yjsNode;

  if (isTextNode(node)) {
    const textContent = node.getTextContent();
    yjsNode = new XmlText();
    yjsNode.insert(0, textContent);
  } else {
    yjsNode = new XmlElement(node.getType());
  }

  if (isDecoratorNode(node)) {
    const ref = node.__ref;
    if (ref !== null) {
      const id = ref.id;
      yjsNode.setAttribute('__ref', ref === null ? null : `${id}|${ref._type}`);
      const yjsDocMap = binding.docMap;
      const doc = new Doc();
      yjsNode.insert(0, [doc]);
      yjsDocMap.set(id, doc);
    }
  }

  // Apply properties, except "key", etc
  const properties = Object.keys(node);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (!excludedProperties.has(property)) {
      // $FlowFixMe: intentional
      const value = node[property];
      yjsNode.setAttribute(property, value);
    }
  }

  // Register the yjs node
  registerYjsNode(binding, yjsNode, key);

  // Find the node we should insert this into
  appendYjsNode(binding, yjsNode, node, parentYjsNode);
  return yjsNode;
}

function syncOutlineChildrenChangesToYjs(
  binding: Binding,
  yjsNode: YjsNode,
  prevNode: BlockNode,
  node: BlockNode,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
): void {
  const prevChildren = prevNode.__children;
  const nextChildren = node.__children;
  const prevChildrenLength = prevChildren.length;
  const nextChildrenLength = nextChildren.length;
  const yjsNodeMap = binding.nodeMap;
  const visited = new Set();
  let yjsChildNode = yjsNode.firstChild;

  for (let i = 0; i < nextChildrenLength; i++) {
    const prevKey = prevChildren[i];
    const nextKey = nextChildren[i];
    visited.add(nextKey);

    if (prevKey !== nextKey) {
      yjsChildNode = yjsNodeMap.get(nextKey);
      if (yjsChildNode === undefined || yjsChildNode.parent !== yjsNode) {
        const childNode = nodeMap.get(nextKey);

        if (childNode === undefined) {
          throw new Error('Should never happen');
        }
        // We can't do moves in Yjs, so we instead essentially delete the old
        // and insert the same new node. This also means that the old node
        // nicely gets garbage collected by Yjs.
        if (yjsChildNode !== undefined) {
          removeYjsNode(binding, nextKey, yjsChildNode, childNode, nodeMap);
        }
        yjsChildNode = createYjsNodeFromOutlineNode(
          binding,
          nextKey,
          childNode,
        );
      }
    }
    if (yjsChildNode == null) {
      throw new Error('Should never happen');
    }
    yjsChildNode = yjsChildNode.nextSibling;
  }
  // Remove any nodes that were not visited
  for (let i = 0; i < prevChildrenLength; i++) {
    const prevKey = prevChildren[i];
    if (!visited.has(prevKey)) {
      const prevChildNode = prevNodeMap.get(prevKey);
      yjsChildNode = yjsNodeMap.get(prevKey);
      if (yjsChildNode !== undefined && prevChildNode !== undefined) {
        removeYjsNode(binding, prevKey, yjsChildNode, prevChildNode, nodeMap);
      }
    }
  }
}

function syncOutlineAttributeChangesToYjs(
  yjsNode: YjsNode,
  prevNode: OutlineNode,
  node: OutlineNode,
): void {
  const properties = Object.keys(node);

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (!excludedProperties.has(property)) {
      // $FlowFixMe: intentional
      const prevValue = prevNode[property];
      // $FlowFixMe: intentional
      const value = node[property];
      if (prevValue !== value) {
        yjsNode.setAttribute(property, value);
      }
    }
  }
}

function diffTextContentAndApplyDelta(
  yjsNode: YjsNode,
  key: NodeKey,
  prevText: string,
  text: string,
  selection: null | Selection,
): void {
  const prevTextBound = prevText.length - 1;
  const textBound = text.length - 1;
  let a = prevTextBound;
  let b = textBound;
  let currentText = prevText;
  let didUseSelection = false;
  // Let's see if we can use the current selection to give us
  // an optimized head-start, as the recent changes normally happen
  // around this offset.
  if (selection !== null && selection.isCollapsed()) {
    const anchor = selection.anchor;
    if (anchor.key === key) {
      const offset = anchor.offset;
      const boundDiff = prevTextBound - textBound;
      a = Math.min(a, offset + boundDiff);
      b = Math.min(b, offset);
      didUseSelection = true;
    }
  }
  while (true) {
    const [nextA, nextB, diffA, diffB] = diffText(a, b, currentText, text);
    if (diffA === null || diffB === null) {
      break;
    }
    const delCount = diffA.length;
    currentText = spliceYjsText(
      yjsNode,
      currentText,
      nextA + 1,
      delCount,
      diffB,
    );
    if (currentText === text) {
      return;
    }
    if (didUseSelection) {
      // Using selection didn't help us, let's try from the bounds instead
      didUseSelection = false;
      a = prevTextBound;
      b = textBound;
      continue;
    }
    a = nextA - 1;
    b = nextB - 1;
  }
  // Replace entire string
  yjsNode.delete(0, currentText.length);
  yjsNode.insert(0, text);
  // eslint-disable-next-line no-console
  console.log('TODO: improve diffTextContentAndApplyDelta');
}

function syncOutlineNodeToYjs(
  binding: Binding,
  key: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  selection: null | Selection,
): void {
  const node = nodeMap.get(key);
  const prevNode = prevNodeMap.get(key);
  const yjsNodeMap = binding.nodeMap;
  const yjsNode = yjsNodeMap.get(key);

  // Deletion
  if (node === undefined) {
    if (yjsNode === undefined || prevNode === undefined) {
      // We've already deleted this node in a previous cycle
      return;
    }
    removeYjsNode(binding, key, yjsNode, prevNode, nodeMap);
    return;
  }
  // Creation
  if (yjsNode === undefined) {
    createYjsNodeFromOutlineNode(binding, key, node);
    return;
  }
  // If we don't have it, we just created this node, so we don't need to diff
  if (prevNode === undefined) {
    return;
  }
  // Diff
  syncOutlineAttributeChangesToYjs(yjsNode, prevNode, node);

  if (isTextNode(node) && isTextNode(prevNode)) {
    const prevText = prevNode.__text;
    const text = node.__text;
    if (prevText !== text) {
      diffTextContentAndApplyDelta(yjsNode, key, prevText, text, selection);
    }
  } else if (isBlockNode(node) && isBlockNode(prevNode)) {
    syncOutlineChildrenChangesToYjs(
      binding,
      yjsNode,
      prevNode,
      node,
      prevNodeMap,
      nodeMap,
    );
  }
}

export function syncOutlineUpdateToYjs(
  binding: Binding,
  provider: Provider,
  prevEditorState: EditorState,
  currEditorState: EditorState,
  dirtyNodes: Set<NodeKey>,
): void {
  // This is to prevent us re-diffing and possible re-applying
  // the same change editor state again. For example, if a user
  // types a character and we get it, we don't want to then insert
  // the same character again.
  const processedStates = binding.processedStates;
  if (processedStates.has(currEditorState)) {
    processedStates.delete(currEditorState);
    return;
  }
  binding.doc.transact(() => {
    currEditorState.read(() => {
      const selection = getSelection();
      // Update nodes
      if (dirtyNodes.size > 0) {
        const prevNodeMap = prevEditorState._nodeMap;
        const nodeMap = currEditorState._nodeMap;
        const dirtyNodesArr = Array.from(dirtyNodes);
        for (let i = 0; i < dirtyNodesArr.length; i++) {
          const dirtyKey = dirtyNodesArr[i];
          syncOutlineNodeToYjs(
            binding,
            dirtyKey,
            prevNodeMap,
            nodeMap,
            selection,
          );
        }
      }
      const prevSelection = prevEditorState._selection;
      if (selection === null || !selection.is(prevSelection)) {
        if (prevSelection === null) {
          return;
        }
        syncOutlineSelectionToYjs(binding, provider, selection);
      }
    });
  });
}
