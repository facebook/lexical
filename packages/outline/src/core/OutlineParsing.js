/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {NodeKey, OutlineNode} from './OutlineNode';

import {
  getActiveEditorState,
  getActiveEditor,
  errorOnReadOnly,
} from './OutlineUpdates';
import {
  isRootNode,
  isBlockNode,
  isTextNode,
  isDecoratorNode,
  createEditorStateRef,
} from '.';
import invariant from 'shared/invariant';

export type NodeParserState = {
  originalSelection: null | ParsedSelection,
  remappedSelection?: ParsedSelection,
};

export type ParsedNode = {
  __key: NodeKey,
  __type: string,
  __flags: number,
  __parent: null | NodeKey,
  ...
};

export type ParsedBlockNode = {
  ...ParsedNode,
  __children: Array<NodeKey>,
};

export type ParsedTextNode = {
  ...ParsedNode,
  __text: string,
};

export type ParsedNodeMap = Map<NodeKey, ParsedNode>;

export type ParsedSelection = {
  anchor: {
    key: NodeKey,
    offset: number,
    type: 'text' | 'block',
  },
  focus: {
    key: NodeKey,
    offset: number,
    type: 'text' | 'block',
  },
};

export function createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
): OutlineNode {
  errorOnReadOnly();
  const editor = getActiveEditor();
  return internalCreateNodeFromParse(parsedNode, parsedNodeMap, editor, null);
}

export function internalCreateNodeFromParse(
  parsedNode: $FlowFixMe,
  parsedNodeMap: ParsedNodeMap,
  editor: OutlineEditor,
  parentKey: null | NodeKey,
  state: NodeParserState = {},
): OutlineNode {
  const nodeType = parsedNode.__type;
  const NodeType = editor._typeToKlass.get(nodeType);
  if (NodeType === undefined) {
    invariant(false, 'createNodeFromParse: type "%s" + not found', nodeType);
  }
  const parsedKey = parsedNode.__key;
  // We set the parsedKey to undefined before calling clone() so that
  // we get a new random key assigned.
  parsedNode.__key = undefined;
  const node = NodeType.clone(parsedNode);
  parsedNode.__key = parsedKey;
  const key = node.__key;
  if (isRootNode(node)) {
    const editorState = getActiveEditorState();
    editorState._nodeMap.set('root', node);
  }
  node.__flags = parsedNode.__flags;
  node.__parent = parentKey;
  // We will need to recursively handle the children in the case
  // of a BlockNode.
  if (isBlockNode(node)) {
    const children = parsedNode.__children;
    for (let i = 0; i < children.length; i++) {
      const childKey = children[i];
      const parsedChild = parsedNodeMap.get(childKey);
      if (parsedChild !== undefined) {
        const child = internalCreateNodeFromParse(
          parsedChild,
          parsedNodeMap,
          editor,
          key,
          state,
        );
        const newChildKey = child.getKey();
        node.__children.push(newChildKey);
      }
    }
    node.__indent = parsedNode.__indent;
    node.__format = parsedNode.__format;
  } else if (isTextNode(node)) {
    node.__format = parsedNode.__format;
    node.__style = parsedNode.__style;
  } else if (isDecoratorNode(node)) {
    const parsedRef = parsedNode.__ref;
    let ref = null;
    if (parsedRef !== null) {
      const refType = parsedRef.type;
      if (refType === 'editorstate') {
        ref = createEditorStateRef(parsedRef.id, parsedRef.editorState);
      }
    }
    node.__ref = ref;
  }
  // The selection might refer to an old node whose key has changed. Produce a
  // new selection record with the old keys mapped to the new ones.
  const originalSelection = state != null ? state.originalSelection : undefined;
  if (originalSelection != null) {
    if (parsedNode.__key === originalSelection.anchor.key) {
      state.remappedSelection = state.remappedSelection || {
        anchor: {
          ...originalSelection.anchor,
        },
        focus: {
          ...originalSelection.focus,
        },
      };
      state.remappedSelection.anchor.key = node.__key;
    }
    if (parsedNode.__key === originalSelection.focus.key) {
      state.remappedSelection = state.remappedSelection || {
        anchor: {
          ...originalSelection.anchor,
        },
        focus: {
          ...originalSelection.focus,
        },
      };
      state.remappedSelection.focus.key = node.__key;
    }
  }
  return node;
}
