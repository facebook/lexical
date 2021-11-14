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
  Selection,
  State,
} from 'outline';
import type {Binding, YjsNodeMap, ReverseYjsNodeMap, Provider} from '.';
// $FlowFixMe: need Flow typings for yjs
import {XmlElement, XmlText} from 'yjs';
import {
  createCursor,
  createCursorSelection,
  createRelativePosition,
  createAbsolutePosition,
  shouldUpdatePosition,
  updateCursor,
  destroyCursor,
} from './Cursors';
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

  const properties = Object.keys(attributes);
  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (property === '__type') {
      continue;
    }
    const yjsValue = attributes[property];
    // $FlowFixMe: intentional
    node[property] = yjsValue;
  }

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
): YjsNode {
  // We first validate that the parent exists
  const parent = node.getParentOrThrow();
  const parentKey = parent.getKey();
  const parentYjsElement = yjsNodeMap.get(parentKey);
  if (parentYjsElement === undefined) {
    return createYjsNodeFromOutlineNode(
      parentKey,
      parent,
      yjsNodeMap,
      reverseYjsNodeMap,
    );
  }
  let yjsNode;

  if (isTextNode(node)) {
    const textContent = node.getTextContent();
    yjsNode = new XmlText();
    yjsNode.insert(0, textContent);
  } else {
    yjsNode = new XmlElement(node.getType());
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
    let siblingYjsNode = yjsNodeMap.get(siblingKey);
    if (siblingYjsNode === undefined) {
      // Let's create the sibling first
      siblingYjsNode = createYjsNodeFromOutlineNode(
        siblingKey,
        prevSibling,
        yjsNodeMap,
        reverseYjsNodeMap,
      );
    }
  }
  const index = node.getIndexWithinParent();
  parentYjsElement.insert(index, [yjsNode]);
  return yjsNode;
}

function spliceText(
  yjsNode: YjsNode,
  text: string,
  index: number,
  delCount: number,
  newText: string,
) {
  if (delCount !== 0) {
    yjsNode.delete(index, delCount);
  }
  if (newText !== '') {
    yjsNode.insert(index, newText);
  }
  return text.slice(0, index) + newText + text.slice(index + delCount);
}

function diff(
  startingA: number,
  startingB: number,
  currentText: string,
  text: string,
) {
  let a = startingA;
  let b = startingB;
  let charA = currentText[a];
  let charB = text[b];
  let diffA = '';
  let diffB = '';
  let hasMismatch = false;
  while (a >= 0 || b >= 0) {
    if (charA === charB) {
      if (hasMismatch) {
        break;
      }
      charA = currentText[--a];
      charB = text[--b];
    } else {
      hasMismatch = true;
      if (a > b) {
        diffA = charA + diffA;
        charA = currentText[--a];
      } else {
        diffB = charB + diffB;
        charB = text[--b];
      }
    }
  }
  if (diffA !== '' || diffB !== '') {
    return [a, b, diffA, diffB];
  }
  return [0, 0, null, null];
}

export function diffTextContentAndApplyDelta(
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
    const [nextA, nextB, diffA, diffB] = diff(a, b, currentText, text);
    if (diffA === null || diffB === null) {
      break;
    }
    const delCount = diffA.length;
    currentText = spliceText(yjsNode, currentText, nextA + 1, delCount, diffB);
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
  throw new Error('TODO: diffTextContentAndApplyDelta');
}

function getIndexOfYjsNode(yjsParentNode: YjsNode, yjsNode: YjsNode): number {
  let node = yjsParentNode.firstChild;
  let i = -1;

  if (node === null) {
    return -1;
  }
  do {
    i++;
    if (node === yjsNode) {
      return i;
    }
    node = node.nextSibling;
    if (node === null) {
      return -1;
    }
  } while (node !== null);
  return i;
}

function removeYjsNode(
  key: NodeKey,
  yjsNode: YjsNode,
  node: OutlineNode,
  nodeMap: NodeMap,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
): void {
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

function syncOutlineNodeToYjs(
  key: NodeKey,
  prevNodeMap: NodeMap,
  nodeMap: NodeMap,
  yjsNodeMap: YjsNodeMap,
  reverseYjsNodeMap: ReverseYjsNodeMap,
  selection: null | Selection,
): void {
  const node = nodeMap.get(key);
  const prevNode = prevNodeMap.get(key);
  const yjsNode = yjsNodeMap.get(key);

  if (node === undefined) {
    if (yjsNode === undefined || prevNode === undefined) {
      throw new Error('Should never happen');
    }
    removeYjsNode(
      key,
      yjsNode,
      prevNode,
      nodeMap,
      yjsNodeMap,
      reverseYjsNodeMap,
    );
    return;
  }
  if (yjsNode === undefined) {
    createYjsNodeFromOutlineNode(key, node, yjsNodeMap, reverseYjsNodeMap);
    return;
  }
  // If we don't have it, we just created this node, so we don't need to diff
  if (prevNode === undefined) {
    return;
  }
  // Diff
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

  if (isTextNode(node) && isTextNode(prevNode)) {
    const prevText = prevNode.__text;
    const text = node.__text;
    if (prevText !== text) {
      diffTextContentAndApplyDelta(yjsNode, key, prevText, text, selection);
    }
  } else if (isBlockNode(node) && isBlockNode(prevNode)) {
    const prevChildren = prevNode.__children;
    const nextChildren = node.__children;
    const nextChildrenLength = nextChildren.length;
    let yjsChildNode = yjsNode.firstChild;

    for (let i = 0; i < nextChildrenLength; i++) {
      const prevKey = prevChildren[i];
      const nextKey = nextChildren[i];

      if (prevKey !== nextKey) {
        yjsChildNode = yjsNodeMap.get(nextKey);
        if (yjsChildNode === undefined || yjsChildNode.parent !== yjsNode) {
          const childNode = nodeMap.get(nextKey);
          if (childNode === undefined) {
            throw new Error('Should never happen');
          }
          if (yjsChildNode !== undefined) {
            removeYjsNode(
              nextKey,
              yjsChildNode,
              childNode,
              nodeMap,
              yjsNodeMap,
              reverseYjsNodeMap,
            );
          }
          yjsChildNode = createYjsNodeFromOutlineNode(
            nextKey,
            childNode,
            yjsNodeMap,
            reverseYjsNodeMap,
          );
        }
      }
      if (yjsChildNode == null) {
        throw new Error('Should never happen');
      }
      yjsChildNode = yjsChildNode.nextSibling;
    }
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
    currEditorState.read((state) => {
      const selection = state.getSelection();
      // Update nodes
      if (dirtyNodes.size > 0) {
        const prevNodeMap = prevEditorState._nodeMap;
        const nodeMap = currEditorState._nodeMap;
        const yjsNodeMap = binding.nodeMap;
        const reverseYjsNodeMap = binding.reverseNodeMap;
        const dirtyNodesArr = Array.from(dirtyNodes);
        for (let i = 0; i < dirtyNodesArr.length; i++) {
          const dirtyKey = dirtyNodesArr[i];
          syncOutlineNodeToYjs(
            dirtyKey,
            prevNodeMap,
            nodeMap,
            yjsNodeMap,
            reverseYjsNodeMap,
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

function syncOutlineSelectionToYjs(
  binding: Binding,
  provider: Provider,
  selection: null | Selection,
): void {
  const awareness = provider.awareness;
  const {
    anchorPos: currentAnchorPos,
    focusPos: currentFocusPos,
    name,
    color,
  } = awareness.getLocalState();
  let anchorPos = undefined;
  let focusPos = undefined;

  if (selection !== null) {
    anchorPos = createRelativePosition(selection.anchor, binding);
    focusPos = createRelativePosition(selection.focus, binding);
  }

  if (
    shouldUpdatePosition(currentAnchorPos, anchorPos) ||
    shouldUpdatePosition(currentFocusPos, focusPos)
  ) {
    awareness.setLocalState({name, color, anchorPos, focusPos});
  }
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
    throw new Error('TODO: syncYjsNodeToOutline');
  }
  if (attributesChanged === null || attributesChanged.size > 0) {
    const attributes = yjsNode.getAttributes();
    const changedProperties =
      attributesChanged === null
        ? Object.keys(attributes)
        : Array.from(attributesChanged);

    if (changedProperties !== null) {
      for (let i = 0; i < changedProperties.length; i++) {
        const changedProperty = changedProperties[i];
        const yjsValue = attributes[changedProperty];
        // $FlowFixMe: intentional
        const outlineValue = node[changedProperty];
        if (outlineValue !== yjsValue) {
          const writableNode = node.getWritable();
          writableNode[changedProperty] = yjsValue;
        }
      }
    }
  }
  if (childListChanged) {
    if (isTextNode(node)) {
      const text = node.__text;
      const yjsText = yjsNode.toJSON();
      if (text !== yjsText) {
        const writableNode = node.getWritable();
        writableNode.__text = yjsText;
      }
    } else if (isBlockNode(node)) {
      const writableNode = node.getWritable();
      const prevChildren = writableNode.__children;
      const keysToRemove = new Set(prevChildren);
      const nextChildren = (writableNode.__children = []);
      let index = 0;
      let childYjsNode = yjsNode.firstChild;

      while (childYjsNode !== null) {
        let childKey = reverseYjsNodeMap.get(childYjsNode);
        if (childKey === undefined) {
          childKey = createOutlineNodeFromYjsNode(
            childYjsNode,
            key,
            yjsNodeMap,
            reverseYjsNodeMap,
            nodeTypes,
          );
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
        keysToRemove.delete(childKey);
        nextChildren[index++] = childKey;
        if (childYjsNode !== null) {
          childYjsNode = childYjsNode.nextSibling;
        }
      }
      if (keysToRemove.size > 0) {
        const childrenToRemove = Array.from(keysToRemove);
        for (let i = 0; i < childrenToRemove.length; i++) {
          const nodeToRemoe = nodeMap.get(childrenToRemove[i]);
          if (nodeToRemoe !== undefined) {
            nodeToRemoe.remove();
          }
        }
      }
    }
  }
}

export function syncYjsChangesToOutline(
  binding: Binding,
  editor: OutlineEditor,
  provider: Provider,
  events: Array<YjsEvent>,
): void {
  editor.update(
    (state) => {
      const pendingEditorState = editor._pendingEditorState;
      if (pendingEditorState === null) {
        throw new Error('Not possible');
      }
      binding.processedStates.add(pendingEditorState);
      const currNodeMap = pendingEditorState._nodeMap;
      const yjsNodeMap = binding.nodeMap;
      const nodeTypes = editor._nodeTypes;
      const reverseYjsNodeMap = binding.reverseNodeMap;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const {
          target: yjsNode,
          childListChanged,
          attributesChanged,
          keysChanged,
        } = event;
        syncYjsNodeToOutline(
          yjsNode,
          currNodeMap,
          yjsNodeMap,
          reverseYjsNodeMap,
          childListChanged,
          attributesChanged || keysChanged,
          nodeTypes,
        );
      }
      syncLocalCursorPosition(
        editor,
        binding,
        provider,
        reverseYjsNodeMap,
        state,
      );
      // If we our selection is broken, we should move selection to end.
      // TODO: we need to properly restore selection in remove() on a deep node.
      const selection = state.getSelection();
      if (selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        let recoveryNeeded = false;
        try {
          if (!anchor.getNode().isAttached() || !focus.getNode().isAttached()) {
            recoveryNeeded = true;
          }
        } catch {
          recoveryNeeded = true;
        }
        if (recoveryNeeded) {
          state.getRoot().selectEnd();
        }
      }
    },
    () => {
      syncCursorPositions(editor, binding, provider);
    },
  );
}

function syncLocalCursorPosition(
  editor: OutlineEditor,
  binding: Binding,
  provider: Provider,
  reverseNodeMap: ReverseYjsNodeMap,
  state: State,
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();
  const anchorPos = localState.anchorPos;
  const focusPos = localState.focusPos;

  if (anchorPos !== undefined && focusPos !== undefined) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);

    if (anchorAbsPos !== null && focusAbsPos !== null) {
      const anchorKey = reverseNodeMap.get(anchorAbsPos.type);
      const focusKey = reverseNodeMap.get(focusAbsPos.type);
      const anchorOffset = anchorAbsPos.index;
      const focusOffset = focusAbsPos.index;

      if (anchorKey !== undefined && focusKey !== undefined) {
        const selection = state.getSelection();
        if (selection === null) {
          throw new Error('TODO: syncLocalCursorPosition');
        }
        const anchor = selection.anchor;
        const focus = selection.focus;

        if (anchor.key !== anchorKey || anchor.offset !== anchorOffset) {
          const anchorNode = state.getNodeByKey(anchorKey);
          selection.anchor.set(
            anchorKey,
            anchorOffset,
            isBlockNode(anchorNode) ? 'block' : 'text',
          );
        }
        if (focus.key !== focusKey || focus.offset !== focusOffset) {
          const focusNode = state.getNodeByKey(focusKey);
          selection.focus.set(
            focusKey,
            focusOffset,
            isBlockNode(focusNode) ? 'block' : 'text',
          );
        }
      }
    }
  }
}

export function syncCursorPositions(
  editor: OutlineEditor,
  binding: Binding,
  provider: Provider,
): void {
  const awarenessStates = Array.from(provider.awareness.getStates());
  const localClientID = binding.doc.clientID;
  const reverseNodeMap = binding.reverseNodeMap;
  const cursors = binding.cursors;
  const nodeMap = editor._editorState._nodeMap;
  const visitedClientIDs = new Set();

  for (let i = 0; i < awarenessStates.length; i++) {
    const awarenessState = awarenessStates[i];
    const [clientID, awareness] = awarenessState;

    if (clientID !== localClientID) {
      visitedClientIDs.add(clientID);
      const {anchorPos, focusPos, name, color} = awareness;
      let selection = null;

      let cursor = cursors.get(clientID);
      if (cursor === undefined) {
        cursor = createCursor(name, color);
        cursors.set(clientID, cursor);
      }
      if (anchorPos !== undefined && focusPos !== undefined) {
        const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
        const focusAbsPos = createAbsolutePosition(focusPos, binding);

        if (anchorAbsPos !== null && focusAbsPos !== null) {
          const anchorKey = reverseNodeMap.get(anchorAbsPos.type);
          const focusKey = reverseNodeMap.get(focusAbsPos.type);
          if (anchorKey !== undefined && focusKey !== undefined) {
            const anchorOffset = anchorAbsPos.index;
            const focusOffset = focusAbsPos.index;
            selection = cursor.selection;

            if (selection === null) {
              selection = createCursorSelection(
                cursor,
                anchorKey,
                anchorOffset,
                focusKey,
                focusOffset,
              );
            } else {
              const anchor = selection.anchor;
              const focus = selection.focus;
              anchor.key = anchorKey;
              anchor.offset = anchorOffset;
              focus.key = focusKey;
              focus.offset = focusOffset;
            }
          }
        }
      }
      updateCursor(binding, cursor, selection, editor, nodeMap);
    }
  }
  const allClientIDs = Array.from(cursors.keys());
  for (let i = 0; i < allClientIDs.length; i++) {
    const clientID = allClientIDs[i];
    if (!visitedClientIDs.has(clientID)) {
      const cursor = cursors.get(clientID);
      if (cursor !== undefined) {
        destroyCursor(binding, cursor);
        cursors.delete(clientID);
      }
    }
  }
}
