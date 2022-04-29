/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {LexicalNode, NodeKey} from './LexicalNode';

import invariant from 'shared/invariant';

import {$isElementNode, $isRootNode, $isTextNode, createEditor} from '.';
import {
  errorOnReadOnly,
  getActiveEditor,
  getActiveEditorState,
  parseEditorState,
} from './LexicalUpdates';

export type NodeParserState = {
  originalSelection: null | ParsedSelection,
  remappedSelection?: ParsedSelection,
};

export type ParsedNode = {
  __key: NodeKey,
  __parent: null | NodeKey,
  __type: string,
  __next: null | NodeKey,
  __prev: null | NodeKey,
  ...
};

export type ParsedElementNode = {
  ...ParsedNode,
  __first: null | NodeKey,
  __last: null | NodeKey,
  __size: null | number,
  __dir: 'ltr' | 'rtl' | null,
  __format: number,
  __indent: number,
  ...
};

export type ParsedTextNode = {
  ...ParsedNode,
  __format: number,
  __mode: number,
  __text: string,
};

export type ParsedNodeMap = Map<NodeKey, ParsedNode>;

export type ParsedRangeSelection = {
  anchor: {
    key: string,
    offset: number,
    type: 'text' | 'element',
  },
  focus: {
    key: string,
    offset: number,
    type: 'text' | 'element',
  },
  type: 'range',
};

export type ParsedNodeSelection = {
  nodes: Array<NodeKey>,
  type: 'node',
};

export type ParsedGridSelection = {
  anchor: {
    key: string,
    offset: number,
    type: 'text' | 'element',
  },
  focus: {
    key: string,
    offset: number,
    type: 'text' | 'element',
  },
  gridKey: NodeKey,
  type: 'grid',
};

export type ParsedSelection =
  | ParsedRangeSelection
  | ParsedNodeSelection
  | ParsedGridSelection;

export function $createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
): LexicalNode {
  errorOnReadOnly();
  const editor = getActiveEditor();
  return internalCreateNodeFromParse(parsedNode, parsedNodeMap, editor, null);
}

export function internalCreateNodeFromParse(
  parsedNode: $FlowFixMe,
  parsedNodeMap: ParsedNodeMap,
  editor: LexicalEditor,
  parentKey: null | NodeKey,
  state: NodeParserState = {originalSelection: null},
): LexicalNode {
  const nodeType = parsedNode.__type;
  const registeredNode = editor._nodes.get(nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'createNodeFromParse: type "%s" + not found', nodeType);
  }
  // Check for properties that are editors
  for (const property in parsedNode) {
    const value = parsedNode[property];
    if (value != null && typeof value === 'object') {
      const parsedEditorState = value.editorState;
      if (parsedEditorState != null) {
        const nestedEditor = createEditor();
        nestedEditor._nodes = editor._nodes;
        nestedEditor._parentEditor = editor._parentEditor;
        nestedEditor._pendingEditorState = parseEditorState(
          parsedEditorState,
          nestedEditor,
        );
        parsedNode[property] = nestedEditor;
      }
    }
  }
  const NodeKlass = registeredNode.klass;
  const parsedKey = parsedNode.__key;
  // We set the parsedKey to undefined before calling clone() so that
  // we get a new random key assigned.
  parsedNode.__key = undefined;
  const node = NodeKlass.clone(parsedNode);
  parsedNode.__key = parsedKey;
  const key = node.__key;
  if ($isRootNode(node)) {
    const editorState = getActiveEditorState();
    editorState._nodeMap.set('root', node);
  }
  node.__parent = parentKey;
  // We will need to recursively handle the children in the case
  // of a ElementNode.
  if ($isElementNode(node)) {
    const firstChild = parsedNode.__first;
    let next = firstChild;
    let childCount = 0;
    while (next !== null) {
      const parsedChild = parsedNodeMap.get(next);
      if (parsedChild !== undefined) {
        const child = internalCreateNodeFromParse(
          parsedChild,
          parsedNodeMap,
          editor,
          key,
          state,
        );
        if (firstChild === next) {
          node.__first = child.__key;
        } else if (next === null) {
          node.__last = child.__key;
        }
        childCount++;
        next = child.__next;
      }
    }
    node.__size = childCount;
    node.__indent = parsedNode.__indent;
    node.__format = parsedNode.__format;
    node.__dir = parsedNode.__dir;
  } else if ($isTextNode(node)) {
    node.__format = parsedNode.__format;
    node.__style = parsedNode.__style;
    node.__mode = parsedNode.__mode;
    node.__detail = parsedNode.__detail;
  }
  // The selection might refer to an old node whose key has changed. Produce a
  // new selection record with the old keys mapped to the new ones.
  const originalSelection = state != null ? state.originalSelection : undefined;
  if (originalSelection != null) {
    let remappedSelection = state.remappedSelection;

    if (originalSelection.type === 'range') {
      const anchor = originalSelection.anchor;
      const focus = originalSelection.focus;

      if (
        remappedSelection == null &&
        (parsedKey === anchor.key || parsedKey === focus.key)
      ) {
        state.remappedSelection = remappedSelection = {
          anchor: {
            ...anchor,
          },
          focus: {
            ...focus,
          },
          type: 'range',
        };
      }
      if (remappedSelection != null && remappedSelection.type === 'range') {
        if (parsedKey === anchor.key) {
          remappedSelection.anchor.key = key;
        }
        if (parsedKey === focus.key) {
          remappedSelection.focus.key = key;
        }
      }
    } else if (originalSelection.type === 'node') {
      const nodes = originalSelection.nodes;
      const indexOf = nodes.indexOf(parsedKey);
      if (indexOf !== -1) {
        if (remappedSelection == null) {
          state.remappedSelection = remappedSelection = {
            nodes: [...nodes],
            type: 'node',
          };
        }
        if (remappedSelection.type === 'node') {
          remappedSelection.nodes.splice(indexOf, 1, key);
        }
      }
    } else if (originalSelection.type === 'grid') {
      const gridKey = originalSelection.gridKey;
      const anchorCellKey = originalSelection.anchor.key;
      const focusCellKey = originalSelection.focus.key;
      if (
        remappedSelection == null &&
        (gridKey === parsedKey ||
          gridKey === anchorCellKey ||
          gridKey === focusCellKey)
      ) {
        state.remappedSelection = remappedSelection = {
          ...originalSelection,
          type: 'grid',
        };
      }
      if (remappedSelection != null && remappedSelection.type === 'grid') {
        if (gridKey === parsedKey) {
          remappedSelection.gridKey = key;
        }
        if (anchorCellKey === parsedKey) {
          remappedSelection.anchor.key = key;
        }
        if (focusCellKey === parsedKey) {
          remappedSelection.focus.key = key;
        }
      }
    }
  }
  return node;
}
