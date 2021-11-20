/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  BlockNode,
  TextNode,
  NodeKey,
  NodeMap,
  OutlineNode,
  OutlineRef,
} from 'outline';
import type {Binding, Provider, YjsEvent, YjsNode} from '.';

// $FlowFixMe: need Flow typings for yjs
import {XmlText} from 'yjs';
import {
  isTextNode,
  isBlockNode,
  isDecoratorNode,
  getSelection,
  getRoot,
  setSelection,
  createEditorStateRef,
} from 'outline';
import {
  syncCursorPositions,
  syncLocalCursorPosition,
  syncOutlineSelectionToYjs,
} from './SyncCursors';
import {registerYjsNode} from './Utils';
import {createOffsetView} from 'outline/offsets';

function createOutlineBlockNodeChildren(
  binding: Binding,
  yjsNode: YjsNode,
  node: BlockNode,
  key: NodeKey,
): void {
  const childKeys = node.__children;
  let childYjsNode = yjsNode.firstChild;

  while (childYjsNode !== null) {
    childKeys.push(createOutlineNodeFromYjsNode(binding, childYjsNode, key));
    childYjsNode = childYjsNode.nextSibling;
  }
}

function createOutlineNodeFromYjsNode(
  binding: Binding,
  yjsNode: YjsNode,
  parentKey: NodeKey,
): NodeKey {
  const attributes = yjsNode.getAttributes();
  const nodeType = attributes.__type;
  const nodeTypes = binding.editor._nodeTypes;
  const NodeType = nodeTypes.get(nodeType);
  if (NodeType === undefined) {
    throw new Error('createOutlineNodeFromYjsNode failed');
  }
  if (yjsNode instanceof XmlText) {
    attributes.__text = yjsNode.toJSON();
  } else if ('__ref' in attributes) {
    attributes.__ref = createRefFromYjsRefAttribute(
      binding,
      yjsNode,
      attributes.__ref,
    );
  }
  const node = NodeType.clone(attributes);
  const key = node.__key;
  node.__parent = parentKey;

  registerYjsNode(binding, yjsNode, key);

  if (isBlockNode(node)) {
    createOutlineBlockNodeChildren(binding, yjsNode, node, key);
  }
  return key;
}

function createRefFromYjsRefAttribute(
  binding: Binding,
  yjsNode: YjsNode,
  yjsAttribute: null | string,
): null | OutlineRef {
  if (yjsAttribute !== null) {
    const [id, type] = yjsAttribute.split('|');
    if (type === 'editorstate') {
      const ref = createEditorStateRef(id, null);
      const doc = yjsNode.firstChild;
      if (doc !== null) {
        const yjsDocMap = binding.docMap;
        yjsDocMap.set(id, doc);
      }
      return ref;
    }
  }
  return null;
}

function syncYjsAttributesToOutlineProperties(
  binding: Binding,
  yjsNode: YjsNode,
  node: OutlineNode,
  attributesChanged: null | Set<string>,
) {
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
      // Handle refs
      if (changedProperty === '__ref' && isDecoratorNode(node)) {
        let ref = outlineValue;
        if (yjsValue === null) {
          if (ref !== null) {
            const writableNode = node.getWritable();
            writableNode.__ref = null;
          }
        } else if (ref === null) {
          const writableNode = node.getWritable();
          ref = createRefFromYjsRefAttribute(binding, yjsNode, yjsValue);
          writableNode.__ref = ref;
        }
        continue;
      }
      if (outlineValue !== yjsValue) {
        const writableNode = node.getWritable();
        writableNode[changedProperty] = yjsValue;
      }
    }
  }
}

function syncYjsTextChangesToOutline(yjsNode: YjsNode, node: TextNode): void {
  const text = node.__text;
  const yjsText = yjsNode.toJSON();
  if (text !== yjsText) {
    const writableNode = node.getWritable();
    writableNode.__text = yjsText;
  }
}

function syncYjsChildrenChangesToOutline(
  binding: Binding,
  yjsNode: YjsNode,
  node: BlockNode,
  nodeMap: NodeMap,
  key: NodeKey,
) {
  const writableNode = node.getWritable();
  const prevChildren = writableNode.__children;
  const keysToRemove = new Set(prevChildren);
  const nextChildren = (writableNode.__children = []);
  const reverseYjsNodeMap = binding.reverseNodeMap;
  let index = 0;
  let childYjsNode = yjsNode.firstChild;

  while (childYjsNode !== null) {
    let childKey = reverseYjsNodeMap.get(childYjsNode);
    if (childKey === undefined) {
      childKey = createOutlineNodeFromYjsNode(binding, childYjsNode, key);
    } else {
      // Update child
      syncYjsNodeToOutline(binding, childYjsNode, nodeMap, false, null);
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
      const nodeToRemove = nodeMap.get(childrenToRemove[i]);
      if (nodeToRemove !== undefined) {
        const writable = nodeToRemove.getWritable();
        writable.__parent = null;
        nodeToRemove.remove();
      }
    }
  }
}

function syncYjsNodeToOutline(
  binding: Binding,
  yjsNode: YjsNode,
  nodeMap: NodeMap,
  childListChanged: boolean,
  attributesChanged: null | Set<string>,
): void {
  const reverseYjsNodeMap = binding.reverseNodeMap;
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
    createOutlineNodeFromYjsNode(binding, yjsNode, parentKey);
    return;
  }
  if (attributesChanged === null || attributesChanged.size > 0) {
    syncYjsAttributesToOutlineProperties(
      binding,
      yjsNode,
      node,
      attributesChanged,
    );
  }
  if (childListChanged) {
    if (isTextNode(node)) {
      syncYjsTextChangesToOutline(yjsNode, node);
    } else if (isBlockNode(node)) {
      syncYjsChildrenChangesToOutline(binding, yjsNode, node, nodeMap, key);
    }
  }
}

export function syncYjsChangesToOutline(
  binding: Binding,
  provider: Provider,
  events: Array<YjsEvent>,
): void {
  const editor = binding.editor;
  const currentEditorState = editor._editorState;
  editor.update(
    (state) => {
      const pendingEditorState = editor._pendingEditorState;
      if (pendingEditorState === null) {
        throw new Error('Not possible');
      }
      binding.processedStates.add(pendingEditorState);
      const currNodeMap = pendingEditorState._nodeMap;
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const {
          target: yjsNode,
          childListChanged,
          attributesChanged,
          keysChanged,
        } = event;
        syncYjsNodeToOutline(
          binding,
          yjsNode,
          currNodeMap,
          childListChanged,
          attributesChanged || keysChanged,
        );
      }
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
          if (
            // We might have removed a node that no longer exists
            !anchorNode.isAttached() ||
            !focusNode.isAttached() ||
            // If we've split a node, then the offset might not be right
            (isTextNode(anchorNode) &&
              anchor.offset > anchorNode.getTextContentSize()) ||
            (isTextNode(focusNode) &&
              focus.offset > focusNode.getTextContentSize())
          ) {
            recoveryNeeded = true;
          }
        } catch (e) {
          // Sometimes checking nor a node via getNode might trigger
          // an error, so we need recovery then too.
          recoveryNeeded = true;
        }
        if (recoveryNeeded) {
          const prevSelection = currentEditorState._selection;
          if (prevSelection !== null) {
            const prevOffsetView = createOffsetView(
              editor,
              0,
              currentEditorState,
            );
            const [start, end] =
              prevOffsetView.getOffsetsFromSelection(prevSelection);
            const nextOffsetView = createOffsetView(
              editor,
              0,
              pendingEditorState,
            );
            const nextSelection = nextOffsetView.createSelectionFromOffsets(
              start,
              end,
            );
            if (nextSelection !== null) {
              setSelection(nextSelection);
            } else {
              // Fallback
              getRoot().selectEnd();
            }
          }
          syncOutlineSelectionToYjs(binding, provider, getSelection());
        } else {
          syncLocalCursorPosition(binding, provider);
        }
      }
    },
    () => {
      syncCursorPositions(binding, provider);
    },
  );
}
