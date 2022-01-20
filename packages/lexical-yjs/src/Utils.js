/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, LexicalNode, TextNode, Selection} from 'lexical';
import type {YjsNode, Binding} from '.';

import {
  $getNodeByKey,
  $isElementNode,
  $isTextNode,
  $isLineBreakNode,
  $isDecoratorNode,
} from 'lexical';
import {CollabElementNode, $createCollabElementNode} from './CollabElementNode';
import {CollabTextNode, $createCollabTextNode} from './CollabTextNode';
import {
  CollabLineBreakNode,
  $createCollabLineBreakNode,
} from './CollabLineBreakNode';
import {
  CollabDecoratorNode,
  $createCollabDecoratorNode,
} from './CollabDecoratorNode';
import {XmlText, XmlElement, Map as YMap} from 'yjs';

const excludedProperties: Set<string> = new Set([
  '__key',
  '__children',
  '__parent',
  '__cachedText',
  '__text',
  '__state',
]);

export function getIndexOfYjsNode(
  yjsParentNode: YjsNode,
  yjsNode: YjsNode,
): number {
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

export function $getNodeByKeyOrThrow(key: NodeKey): LexicalNode {
  const node = $getNodeByKey(key);
  if (node === null) {
    throw new Error('Should never happen');
  }
  return node;
}

export function $createCollabNodeFromLexicalNode(
  binding: Binding,
  lexicalNode: LexicalNode,
  parent: CollabElementNode,
):
  | CollabElementNode
  | CollabTextNode
  | CollabLineBreakNode
  | CollabDecoratorNode {
  const nodeType = lexicalNode.__type;
  let collabNode;
  if ($isElementNode(lexicalNode)) {
    const xmlText = new XmlText();
    collabNode = $createCollabElementNode(xmlText, parent, nodeType);
    collabNode.syncPropertiesFromLexical(binding, lexicalNode, null);
    collabNode.syncChildrenFromLexical(binding, lexicalNode, null, null, null);
  } else if ($isTextNode(lexicalNode)) {
    // TODO create a token text node for immutable, segmented or inert nodes.
    const map = new YMap();
    collabNode = $createCollabTextNode(
      map,
      lexicalNode.__text,
      parent,
      nodeType,
    );
    collabNode.syncPropertiesAndTextFromLexical(binding, lexicalNode, null);
  } else if ($isLineBreakNode(lexicalNode)) {
    const map = new YMap();
    map.set('__type', 'linebreak');
    collabNode = $createCollabLineBreakNode(map, parent);
  } else if ($isDecoratorNode(lexicalNode)) {
    const xmlElem = new XmlElement();
    collabNode = $createCollabDecoratorNode(xmlElem, parent, nodeType);
    collabNode.syncPropertiesFromLexical(binding, lexicalNode, null);
  } else {
    throw new Error('Should never happen');
  }
  collabNode._key = lexicalNode.__key;
  return collabNode;
}

function getNodeTypeFromSharedType(
  sharedType: XmlText | YMap | XmlElement,
): string {
  const type =
    sharedType instanceof YMap
      ? sharedType.get('__type')
      : sharedType.getAttribute('__type');
  if (type == null) {
    throw new Error('Should never happen');
  }
  return type;
}

export function getOrInitCollabNodeFromSharedType(
  binding: Binding,
  sharedType: XmlText | YMap | XmlElement,
  parent?: CollabElementNode,
):
  | CollabElementNode
  | CollabTextNode
  | CollabLineBreakNode
  | CollabDecoratorNode {
  // $FlowFixMe: internal field
  const collabNode = sharedType._collabNode;
  if (collabNode === undefined) {
    const registeredNodes = binding.editor._registeredNodes;
    const type = getNodeTypeFromSharedType(sharedType);
    const nodeInfo = registeredNodes.get(type);
    if (nodeInfo === undefined) {
      throw new Error('Should never happen');
    }
    const sharedParent = sharedType.parent;
    const targetParent =
      parent === undefined && sharedParent !== null
        ? getOrInitCollabNodeFromSharedType(binding, sharedParent)
        : parent || null;
    if (!(targetParent instanceof CollabElementNode)) {
      throw new Error('Should never happen');
    }

    if (sharedType instanceof XmlText) {
      return $createCollabElementNode(sharedType, targetParent, type);
    } else if (sharedType instanceof YMap) {
      if (targetParent === null) {
        throw new Error('Should never happen');
      }
      if (type === 'linebreak') {
        return $createCollabLineBreakNode(sharedType, targetParent);
      }
      return $createCollabTextNode(sharedType, '', targetParent, type);
    } else if (sharedType instanceof XmlElement) {
      return $createCollabDecoratorNode(sharedType, targetParent, type);
    }
  }
  return collabNode;
}

export function createLexicalNodeFromCollabNode(
  binding: Binding,
  collabNode:
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode,
  parentKey: NodeKey,
): LexicalNode {
  const type = collabNode.getType();
  const registeredNodes = binding.editor._registeredNodes;
  const nodeInfo = registeredNodes.get(type);
  if (nodeInfo === undefined) {
    throw new Error('createLexicalNode failed');
  }
  // $FlowFixMe: needs refining
  const lexicalNode: DecoratorNode | TextNode | ElementNode =
    new nodeInfo.klass();
  lexicalNode.__parent = parentKey;
  collabNode._key = lexicalNode.__key;
  if (collabNode instanceof CollabElementNode) {
    const xmlText = collabNode._xmlText;
    collabNode.syncPropertiesFromYjs(binding, null);
    collabNode.applyChildrenYjsDelta(binding, xmlText.toDelta());
    collabNode.syncChildrenFromYjs(binding);
  } else if (collabNode instanceof CollabTextNode) {
    collabNode.syncPropertiesAndTextFromYjs(binding, null);
  } else if (collabNode instanceof CollabDecoratorNode) {
    collabNode.syncPropertiesFromYjs(binding, null);
  }
  binding.collabNodeMap.set(lexicalNode.__key, collabNode);
  return lexicalNode;
}

export function syncPropertiesFromYjs(
  binding: Binding,
  sharedType: XmlText | YMap | XmlElement,
  lexicalNode: LexicalNode,
  keysChanged: null | Set<string>,
): void {
  const properties =
    keysChanged === null
      ? sharedType instanceof YMap
        ? Array.from(sharedType.keys())
        : Object.keys(sharedType.getAttributes())
      : Array.from(keysChanged);
  let writableNode;

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    if (excludedProperties.has(property)) {
      continue;
    }
    // $FlowFixMe: intentional
    const prevValue = lexicalNode[property];
    const nextValue =
      sharedType instanceof YMap
        ? sharedType.get(property)
        : sharedType.getAttribute(property);
    if (prevValue !== nextValue) {
      if (writableNode === undefined) {
        writableNode = lexicalNode.getWritable();
      }
      // $FlowFixMe
      writableNode[property] = nextValue;
    }
  }
}

export function syncPropertiesFromLexical(
  binding: Binding,
  sharedType: XmlText | YMap | XmlElement,
  prevLexicalNode: null | LexicalNode,
  nextLexicalNode: LexicalNode,
): void {
  const type = nextLexicalNode.__type;
  const nodeProperties = binding.nodeProperties;
  let properties = nodeProperties.get(type);

  if (properties === undefined) {
    properties = Object.keys(nextLexicalNode).filter((property) => {
      return !excludedProperties.has(property);
    });
    nodeProperties.set(type, properties);
  }

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const prevValue =
      // $FlowFixMe: intentional override
      prevLexicalNode === null ? undefined : prevLexicalNode[property];
    // $FlowFixMe: intentional override
    const nextValue = nextLexicalNode[property];
    if (prevValue !== nextValue) {
      if (sharedType instanceof YMap) {
        sharedType.set(property, nextValue);
      } else {
        sharedType.setAttribute(property, nextValue);
      }
    }
  }
}

export function spliceString(
  str: string,
  index: number,
  delCount: number,
  newText: string,
): string {
  return str.slice(0, index) + newText + str.slice(index + delCount);
}

export function getPositionFromElementAndOffset(
  node: CollabElementNode,
  offset: number,
  boundaryIsEdge: boolean,
): {
  node:
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
    | null,
  nodeIndex: number,
  offset: number,
  length: number,
} {
  let index = 0;
  let i = 0;
  const children = node._children;
  const childrenLength = children.length;
  for (; i < childrenLength; i++) {
    const child = children[i];
    const childOffset = index;
    const size = child.getSize();
    index += size;
    const exceedsBoundary = boundaryIsEdge ? index >= offset : index > offset;

    if (exceedsBoundary && child instanceof CollabTextNode) {
      let textOffset = offset - childOffset - 1;
      if (textOffset < 0) {
        textOffset = 0;
      }
      const diffLength = size - textOffset;
      return {
        node: child,
        nodeIndex: i,
        offset: textOffset,
        length: diffLength,
      };
    }

    if (index > offset) {
      return {node: child, nodeIndex: i, offset: childOffset, length: 0};
    } else if (i === childrenLength - 1) {
      return {node: null, nodeIndex: i + 1, offset: childOffset + 1, length: 0};
    }
  }
  return {node: null, nodeIndex: 0, offset: 0, length: 0};
}

export function doesSelectionNeedRecovering(selection: Selection): boolean {
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
      ($isTextNode(anchorNode) &&
        anchor.offset > anchorNode.getTextContentSize()) ||
      ($isTextNode(focusNode) && focus.offset > focusNode.getTextContentSize())
    ) {
      recoveryNeeded = true;
    }
  } catch (e) {
    // Sometimes checking nor a node via getNode might trigger
    // an error, so we need recovery then too.
    recoveryNeeded = true;
  }
  return recoveryNeeded;
}
