/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, OutlineNode, RootNode, Point} from 'outline';

// $FlowFixMe: need Flow typings for y-websocket
import {WebsocketProvider} from 'y-websocket';
// $FlowFixMe: need Flow typings for yjs
import * as Y from 'yjs';
import {useEffect, useMemo, useState} from 'react';
import {createParagraphNode} from 'outline/ParagraphNode';

const WEBSOCKET_ENDPOINT = 'ws://localhost:1234';
const slug = 'test';

const isArray = Array.isArray;

function updateYjsNodeWithLocalNode(
  sharedNodeMap,
  key,
  node: OutlineNode,
): void {
  let sharedNode = sharedNodeMap.get(key);
  if (sharedNode === undefined) {
    sharedNode = new Y.Map();
    sharedNodeMap.set(key, sharedNode);
  }
  const keys = Object.keys(node);
  for (let i = 0; i < keys.length; i++) {
    const propKey = keys[i];
    // $FlowFixMe: intentional
    const propValue = node[propKey];
    if (sharedNode.get(propKey) !== propValue) {
      sharedNode.set(propKey, propValue);
    }
  }
}

function updateYjsWithLocalEditorState(
  sharedNodeMap,
  awareness,
  editorState,
  dirtyNodes,
): void {
  const dirtyNodesArr = Array.from(dirtyNodes.keys());
  editorState.read((state) => {
    for (let i = 0; i < dirtyNodesArr.length; i++) {
      const key = dirtyNodesArr[i];
      const node = state.getNodeByKey(key);
      if (node === null) {
        sharedNodeMap.delete(key);
      } else {
        updateYjsNodeWithLocalNode(sharedNodeMap, key, node);
      }
    }
  });
}

function createLocalEditorNodeFromYjsNode(sharedNode, key, editor, nodeMap) {
  const parsedNode = sharedNode.toJSON();
  const nodeType = parsedNode.__type;
  const NodeType = editor._nodeTypes.get(nodeType);
  if (NodeType === undefined) {
    throw new Error('createLocalEditorNodeFromYjsNode failed');
  }
  const node = NodeType.clone(parsedNode);
  node.__parent = parsedNode.__parent;
  nodeMap.set(key, node);
}

function adjustOffset(prevText: string, nextText: string, point: Point): void {
  const offset = point.offset;
  const length = Math.min(offset, Math.min(prevText.length, nextText.length));
  let adjustment = 0;
  let a = 0;
  let b = 0;
  let prevChar = prevText[a];
  let nextChar = nextText[b];

  while (a < length && b < length) {
    if (prevChar === nextChar) {
      prevChar = prevText[a++];
      nextChar = nextText[b++];
    } else {
      adjustment++;
      if (prevText[a] === nextText[b + 1]) {
        nextChar = nextText[b++];
      } else if (prevText[a + 1] === nextText[b]) {
        prevChar = prevText[a++];
      } else {
        prevChar = prevText[a++];
        nextChar = nextText[b++];
      }
    }
  }
  point.offset += adjustment;
}

function updateLocalEditorNodeWithYjsNodeProperties(
  editor,
  sharedNodeMap,
  sharedNode,
  propKeys,
  nodeMap,
  selection,
) {
  const key = sharedNode.get('__key');
  let node = nodeMap.get(key);
  if (node === undefined) {
    return;
  }
  for (let i = 0; i < propKeys.length; i++) {
    const propKey = propKeys[i];
    // $FlowFixMe: intentional
    const prevOutlineValue = node[propKey];
    let outlineValue = prevOutlineValue;
    const yjsValue = sharedNode.get(propKey);
    if (isArray(prevOutlineValue)) {
      for (let s = 0; s < yjsValue.length; s++) {
        if (prevOutlineValue[s] !== yjsValue[s]) {
          outlineValue = yjsValue;
          break;
        }
      }
    } else {
      outlineValue = yjsValue;
    }

    if (outlineValue !== prevOutlineValue) {
      if (propKey === '__text' && selection !== null) {
        const anchor = selection.anchor;
        const focus = selection.focus;
        const isAnchor = anchor.key === key;
        const isFocus = focus.key === key;
        if (isAnchor) {
          adjustOffset(prevOutlineValue, outlineValue, anchor);
        }
        if (isFocus) {
          adjustOffset(prevOutlineValue, outlineValue, focus);
        }
      }
      node = node.getWritable();
      node[propKey] = outlineValue;
    }
  }
}

function updateLocalEditorNodeWithYjsNode(
  sharedNodeMap,
  key,
  nodeMap,
  editor,
  selection,
) {
  const sharedNode = sharedNodeMap.get(key);
  const node = nodeMap.get(key);
  if (sharedNode === undefined) {
    if (node !== undefined) {
      let root: void | RootNode;
      if (selection !== null) {
        const anchor = selection.anchor;
        if (anchor.getNode().is(node)) {
          // $FlowFixMe: root is always there
          root = nodeMap.get('root');
        }
      }
      node.remove();
      if (root !== undefined) {
        root.selectEnd();
      }
    } else {
      nodeMap.delete(key);
    }
    return;
  }
  if (node === undefined) {
    createLocalEditorNodeFromYjsNode(sharedNode, key, editor, nodeMap);
    return;
  }
  const keys = Array.from(sharedNode.keys());
  updateLocalEditorNodeWithYjsNodeProperties(
    editor,
    sharedNodeMap,
    sharedNode,
    keys,
    nodeMap,
    selection,
  );
}

function updateLocalEditorStateWithYjs(
  editor,
  keysChanged,
  nodeMap,
  sharedNodeMap,
  selection,
): void {
  const keys = Array.from(keysChanged);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    updateLocalEditorNodeWithYjsNode(
      sharedNodeMap,
      key,
      nodeMap,
      editor,
      selection,
    );
  }
}

export default function useCollaboration(editor: OutlineEditor): [boolean] {
  const [connected, setConnected] = useState(false);
  const [sharedNodeMap, sharedDoc, provider] = useMemo(() => {
    const doc = new Y.Doc();
    const nodeMap = doc.getMap('nodeMap');
    const websocketProvider = new WebsocketProvider(
      WEBSOCKET_ENDPOINT,
      slug,
      doc,
      {
        connect: false,
      },
    );
    return [nodeMap, doc, websocketProvider];
  }, []);
  const {awareness} = provider;

  useEffect(() => {
    provider.on('status', ({status}: {status: string}) => {
      setConnected(status === 'connected');
    });

    provider.on('sync', (isSynced: boolean) => {
      if (sharedNodeMap.get('root') === undefined) {
        // Init if needed
        editor.update((state) => {
          const root = state.getRoot();
          root.clear();
          const paragraph = createParagraphNode();
          root.append(paragraph);
        });
        return;
      }
    });

    sharedNodeMap.observeDeep((events) => {
      if (sharedNodeMap.get('root') === undefined) {
        return;
      }
      editor.update((state) => {
        const pendingEditorState = editor._pendingEditorState;
        if (pendingEditorState === null) {
          return;
        }
        const nodeMap = pendingEditorState._nodeMap;
        const selection = state.getSelection();
        for (let i = 0; i < events.length; i++) {
          const {keysChanged, target} = events[i];
          if (target === sharedNodeMap) {
            updateLocalEditorStateWithYjs(
              editor,
              keysChanged,
              nodeMap,
              sharedNodeMap,
              selection,
            );
          } else {
            // console.log(sharedNodeMap.toJSON());
            const keys = Array.from(keysChanged);
            updateLocalEditorNodeWithYjsNodeProperties(
              editor,
              sharedNodeMap,
              target,
              keys,
              nodeMap,
              selection,
            );
          }
        }
      });
    });

    provider.connect();

    return () => {
      provider.disconnect();
    };
  }, [editor, provider, sharedNodeMap]);

  useEffect(() => {
    editor.addListener('update', ({editorState, dirty, dirtyNodes}) => {
      if (dirty && dirtyNodes.size > 0) {
        sharedDoc.transact(() => {
          updateYjsWithLocalEditorState(
            sharedNodeMap,
            awareness,
            editorState,
            dirtyNodes,
          );
        });
      }
    });
  }, [editor, sharedNodeMap, awareness, sharedDoc]);

  return [connected];
}
