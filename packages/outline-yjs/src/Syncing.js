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
  DecoratorNode,
  EditorStateRef,
} from 'outline';
import type {Binding, YjsNodeMap, ReverseYjsNodeMap, Provider} from '.';

// $FlowFixMe: need Flow typings for yjs
import {XmlElement, XmlText, Doc} from 'yjs';
import {
  createCursor,
  createCursorSelection,
  createRelativePosition,
  createAbsolutePosition,
  shouldUpdatePosition,
  updateCursor,
  destroyCursor,
} from './Cursors';
import {
  isTextNode,
  isBlockNode,
  isDecoratorNode,
  getSelection,
  getRoot,
  getNodeByKey,
  createEditorStateRef,
} from 'outline';

const excludedProperties = new Set([
  '__key',
  '__children',
  '__parent',
  '__cachedText',
  '__text',
  '__ref',
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
  yjsDocMap: Map<string, Doc>,
): NodeKey {
  const attributes = yjsNode.getAttributes();
  const nodeType = attributes.__type;
  const NodeType = nodeTypes.get(nodeType);
  let yjsRefValue = null;
  if (NodeType === undefined) {
    throw new Error('createOutlineNodeFromYjsNode failed');
  }
  if (yjsNode instanceof XmlText) {
    attributes.__text = yjsNode.toJSON();
  } else if ('__ref' in attributes) {
    yjsRefValue = attributes.__ref;
    attributes.__ref = null;
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
    } else if (property === '__ref' && isDecoratorNode(node)) {
      setDecoratorRef(yjsNode, node, node.__ref, yjsRefValue, yjsDocMap);
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
          yjsDocMap,
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
  yjsDocMap: Map<string, Doc>,
): YjsNode {
  // We first validate that the parent exists
  const parent = node.getParentOrThrow();
  const parentKey = parent.getKey();
  let parentYjsElement = yjsNodeMap.get(parentKey);
  if (parentYjsElement === undefined) {
    parentYjsElement = createYjsNodeFromOutlineNode(
      parentKey,
      parent,
      yjsNodeMap,
      reverseYjsNodeMap,
      yjsDocMap,
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

  if (isDecoratorNode(node)) {
    const ref = node.__ref;
    if (ref !== null) {
      const id = ref.id;
      yjsNode.setAttribute('__ref', ref === null ? null : `${id}|${ref._type}`);
      const doc = new Doc();
      yjsNode.insert(0, [doc]);
      yjsDocMap.set(id, doc);
    }
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
        yjsDocMap,
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
): [number, number, null | string, null | string] {
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
  yjsNode.delete(0, currentText.length);
  yjsNode.insert(0, text);
  // eslint-disable-next-line no-console
  console.log('TODO: improve diffTextContentAndApplyDelta');
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
  yjsDocMap: Map<string, Doc>,
  selection: null | Selection,
): void {
  const node = nodeMap.get(key);
  const prevNode = prevNodeMap.get(key);
  const yjsNode = yjsNodeMap.get(key);

  if (node === undefined) {
    if (yjsNode === undefined || prevNode === undefined) {
      // We've already deleted this node in a previous cycle
      return;
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
    createYjsNodeFromOutlineNode(
      key,
      node,
      yjsNodeMap,
      reverseYjsNodeMap,
      yjsDocMap,
    );
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
    const prevChildrenLength = prevChildren.length;
    const nextChildrenLength = nextChildren.length;
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
            yjsDocMap,
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
          removeYjsNode(
            prevKey,
            yjsChildNode,
            prevChildNode,
            nodeMap,
            yjsNodeMap,
            reverseYjsNodeMap,
          );
        }
      }
    }
  }
}

function setDecoratorRef(
  yjsNode: YjsNode,
  node: DecoratorNode,
  outlineValue: null | string | EditorStateRef,
  yjsValue: null | string,
  yjsDocMap: Map<string, Doc>,
): void {
  let ref = outlineValue;
  if (yjsValue === null) {
    if (ref !== null) {
      const writableNode = node.getWritable();
      writableNode.__ref = null;
    }
  } else if (ref === null) {
    const writableNode = node.getWritable();
    const [id, type] = yjsValue.split('|');
    if (type === 'editorstate') {
      ref = createEditorStateRef(id, null);
      const doc = yjsNode.firstChild;
      if (doc !== null) {
        yjsDocMap.set(id, doc);
      }
    }
    writableNode.__ref = ref;
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
  yjsDocMap: Map<string, Doc>,
): void {
  const key = reverseYjsNodeMap.get(yjsNode);
  if (key === undefined) {
    throw new Error('Should never happen');
  }
  const node = nodeMap.get(key);

  if (node === undefined) {
    const parent = yjsNode.parent;
    const parentKey = reverseYjsNodeMap.get(parent);
    if (parentKey === undefined) {
      throw new Error('Should never happen');
    }
    createOutlineNodeFromYjsNode(
      yjsNode,
      parentKey,
      yjsNodeMap,
      reverseYjsNodeMap,
      nodeTypes,
      yjsDocMap,
    );
    return;
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
        if (changedProperty === '__ref' && isDecoratorNode(node)) {
          setDecoratorRef(yjsNode, node, outlineValue, yjsValue, yjsDocMap);
          continue;
        }
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
            yjsDocMap,
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
            yjsDocMap,
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
        const yjsNodeMap = binding.nodeMap;
        const reverseYjsNodeMap = binding.reverseNodeMap;
        const yjsDocMap = binding.docMap;
        const dirtyNodesArr = Array.from(dirtyNodes);
        for (let i = 0; i < dirtyNodesArr.length; i++) {
          const dirtyKey = dirtyNodesArr[i];
          syncOutlineNodeToYjs(
            dirtyKey,
            prevNodeMap,
            nodeMap,
            yjsNodeMap,
            reverseYjsNodeMap,
            yjsDocMap,
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
  let anchorPos = null;
  let focusPos = null;

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
      const yjsDocMap = binding.docMap;
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
          yjsDocMap,
        );
      }
      syncLocalCursorPosition(editor, binding, provider, reverseYjsNodeMap);
      // If we our selection is broken, we should move selection to end.
      // TODO: we need to properly restore selection in remove() on a deep node.
      const selection = getSelection();
      if (selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        let recoveryNeeded = false;
        try {
          const anchorNode = anchor.getNode();
          const focusNode = focus.getNode();
          if (!anchorNode.isAttached() || !focusNode.isAttached()) {
            recoveryNeeded = true;
          } else {
            // Do check if offset > text size for both points, as node
            // might have been split.
          }
        } catch {
          recoveryNeeded = true;
        }
        if (recoveryNeeded) {
          getRoot().selectEnd();
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
): void {
  const awareness = provider.awareness;
  const localState = awareness.getLocalState();
  const anchorPos = localState.anchorPos;
  const focusPos = localState.focusPos;

  if (anchorPos !== null && focusPos !== null) {
    const anchorAbsPos = createAbsolutePosition(anchorPos, binding);
    const focusAbsPos = createAbsolutePosition(focusPos, binding);

    if (anchorAbsPos !== null && focusAbsPos !== null) {
      const anchorKey = reverseNodeMap.get(anchorAbsPos.type);
      const focusKey = reverseNodeMap.get(focusAbsPos.type);
      const anchorOffset = anchorAbsPos.index;
      const focusOffset = focusAbsPos.index;

      if (anchorKey !== undefined && focusKey !== undefined) {
        const selection = getSelection();
        if (selection === null) {
          throw new Error('TODO: syncLocalCursorPosition');
        }
        const anchor = selection.anchor;
        const focus = selection.focus;

        if (anchor.key !== anchorKey || anchor.offset !== anchorOffset) {
          const anchorNode = getNodeByKey(anchorKey);
          selection.anchor.set(
            anchorKey,
            anchorOffset,
            isBlockNode(anchorNode) ? 'block' : 'text',
          );
        }
        if (focus.key !== focusKey || focus.offset !== focusOffset) {
          const focusNode = getNodeByKey(focusKey);
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
      if (anchorPos !== null && focusPos !== null) {
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
