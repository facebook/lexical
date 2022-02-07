/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {NodeKey, LexicalNode} from './LexicalNode';
import type {
  DecoratorMap,
  DecoratorArray,
  DecoratorStateValue,
} from './nodes/base/LexicalDecoratorNode';

import {
  getActiveEditorState,
  getActiveEditor,
  errorOnReadOnly,
} from './LexicalUpdates';
import {$isRootNode, $isElementNode, $isTextNode, $isDecoratorNode} from '.';
import {
  createDecoratorEditor,
  createDecoratorMap,
  createDecoratorArray,
} from './nodes/base/LexicalDecoratorNode';
import invariant from 'shared/invariant';

export type NodeParserState = {
  originalSelection: null | ParsedSelection,
  remappedSelection?: ParsedSelection,
};

export type ParsedNode = {
  __key: NodeKey,
  __type: string,
  __parent: null | NodeKey,
  ...
};

export type ParsedElementNode = {
  ...ParsedNode,
  __children: Array<NodeKey>,
  __format: number,
  __dir: number,
  __indent: number,
};

export type ParsedTextNode = {
  ...ParsedNode,
  __text: string,
  __mode: number,
  __format: number,
};

export type ParsedNodeMap = Map<NodeKey, ParsedNode>;

export type ParsedSelection = {
  anchor: {
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
  },
  focus: {
    key: NodeKey,
    offset: number,
    type: 'text' | 'element',
  },
};

export function $createNodeFromParse(
  parsedNode: ParsedNode,
  parsedNodeMap: ParsedNodeMap,
): LexicalNode {
  errorOnReadOnly();
  const editor = getActiveEditor();
  return internalCreateNodeFromParse(parsedNode, parsedNodeMap, editor, null);
}

function createDecoratorValueFromParse(
  editor: LexicalEditor,
  parsedValue,
): DecoratorStateValue {
  let value;

  if (
    typeof parsedValue === 'string' ||
    typeof parsedValue === 'number' ||
    typeof parsedValue === 'boolean' ||
    parsedValue === null
  ) {
    value = parsedValue;
  } else if (typeof parsedValue === 'object') {
    const bindingType = parsedValue.type;
    if (bindingType === 'editor') {
      value = createDecoratorEditor(parsedValue.id, parsedValue.editorState);
    } else if (bindingType === 'array') {
      value = createDecoratorArrayFromParse(editor, parsedValue);
    } else {
      value = createDecoratorMapFromParse(editor, parsedValue);
    }
  } else {
    invariant(false, 'Should never happen');
  }
  return value;
}

function createDecoratorArrayFromParse(
  editor: LexicalEditor,
  parsedDecoratorState,
): DecoratorArray {
  const parsedArray = parsedDecoratorState.array;
  const array = [];
  for (let i = 0; i < parsedArray.length; i++) {
    const parsedValue = parsedArray[i];
    array.push(createDecoratorValueFromParse(editor, parsedValue));
  }
  return createDecoratorArray(editor, array);
}

function createDecoratorMapFromParse(
  editor: LexicalEditor,
  parsedDecoratorState,
): DecoratorMap {
  const parsedMap = parsedDecoratorState.map;
  const map = new Map();
  for (let i = 0; i < parsedMap.length; i++) {
    const [key, parsedValue] = parsedMap[i];
    map.set(key, createDecoratorValueFromParse(editor, parsedValue));
  }
  return createDecoratorMap(editor, map);
}

export function internalCreateNodeFromParse(
  parsedNode: $FlowFixMe,
  parsedNodeMap: ParsedNodeMap,
  editor: LexicalEditor,
  parentKey: null | NodeKey,
  state: NodeParserState = {},
): LexicalNode {
  const nodeType = parsedNode.__type;
  const registeredNode = editor._registeredNodes.get(nodeType);
  if (registeredNode === undefined) {
    invariant(false, 'createNodeFromParse: type "%s" + not found', nodeType);
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
    node.__dir = parsedNode.__dir;
  } else if ($isTextNode(node)) {
    node.__format = parsedNode.__format;
    node.__style = parsedNode.__style;
    node.__mode = parsedNode.__mode;
    node.__detail = parsedNode.__detail;
  } else if ($isDecoratorNode(node)) {
    const parsedDecoratorState = parsedNode.__state;
    node.__state = createDecoratorMapFromParse(editor, parsedDecoratorState);
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
