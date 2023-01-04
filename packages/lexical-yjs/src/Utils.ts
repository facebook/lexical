/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding, YjsNode} from '.';
import type {
  DecoratorNode,
  ElementNode,
  LexicalNode,
  NodeMap,
  RangeSelection,
  TextNode,
} from 'lexical';

import {
  $getNodeByKey,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  createEditor,
  NodeKey,
} from 'lexical';
import invariant from 'shared/invariant';
import {Doc, Map as YMap, XmlElement, XmlText} from 'yjs';

import {
  $createCollabDecoratorNode,
  CollabDecoratorNode,
} from './CollabDecoratorNode';
import {$createCollabElementNode, CollabElementNode} from './CollabElementNode';
import {
  $createCollabLineBreakNode,
  CollabLineBreakNode,
} from './CollabLineBreakNode';
import {$createCollabTextNode, CollabTextNode} from './CollabTextNode';

const excludedProperties: Set<string> = new Set([
  '__key',
  '__parent',
  '__cachedText',
  '__text',
  '__size',
  '__next',
  '__prev',
  '__first',
  '__last',
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

    // @ts-expect-error Sibling exists but type is not available from YJS.
    node = node.nextSibling;

    if (node === null) {
      return -1;
    }
  } while (node !== null);

  return i;
}

export function $getNodeByKeyOrThrow(key: NodeKey): LexicalNode {
  const node = $getNodeByKey(key);
  invariant(node !== null, 'could not find node by key');
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
    // TODO create a token text node for token, segmented nodes.
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
    invariant(false, 'Expected text, element, decorator, or linebreak node');
  }

  collabNode._key = lexicalNode.__key;
  return collabNode;
}

function getNodeTypeFromSharedType(
  sharedType: XmlText | YMap<unknown> | XmlElement,
): string {
  const type =
    sharedType instanceof YMap
      ? sharedType.get('__type')
      : sharedType.getAttribute('__type');
  invariant(type != null, 'Expected shared type to include type attribute');
  return type;
}

export function getOrInitCollabNodeFromSharedType(
  binding: Binding,
  sharedType: XmlText | YMap<unknown> | XmlElement,
  parent?: CollabElementNode,
):
  | CollabElementNode
  | CollabTextNode
  | CollabLineBreakNode
  | CollabDecoratorNode {
  // @ts-expect-error: internal field
  const collabNode = sharedType._collabNode;

  if (collabNode === undefined) {
    const registeredNodes = binding.editor._nodes;
    const type = getNodeTypeFromSharedType(sharedType);
    const nodeInfo = registeredNodes.get(type);
    invariant(nodeInfo !== undefined, 'Node %s is not registered', type);

    const sharedParent = sharedType.parent;
    const targetParent =
      parent === undefined && sharedParent !== null
        ? getOrInitCollabNodeFromSharedType(
            binding,
            sharedParent as XmlText | YMap<unknown> | XmlElement,
          )
        : parent || null;

    invariant(
      targetParent instanceof CollabElementNode,
      'Expected parent to be a collab element node',
    );

    if (sharedType instanceof XmlText) {
      return $createCollabElementNode(sharedType, targetParent, type);
    } else if (sharedType instanceof YMap) {
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
  const registeredNodes = binding.editor._nodes;
  const nodeInfo = registeredNodes.get(type);
  invariant(nodeInfo !== undefined, 'Node %s is not registered', type);
  const lexicalNode:
    | DecoratorNode<unknown>
    | TextNode
    | ElementNode
    | LexicalNode = new nodeInfo.klass();
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
  sharedType: XmlText | YMap<unknown> | XmlElement,
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

    const prevValue = lexicalNode[property];
    let nextValue =
      sharedType instanceof YMap
        ? sharedType.get(property)
        : sharedType.getAttribute(property);

    if (prevValue !== nextValue) {
      if (nextValue instanceof Doc) {
        const yjsDocMap = binding.docMap;

        if (prevValue instanceof Doc) {
          yjsDocMap.delete(prevValue.guid);
        }

        const nestedEditor = createEditor();
        const key = nextValue.guid;
        nestedEditor._key = key;
        yjsDocMap.set(key, nextValue);

        nextValue = nestedEditor;
      }

      if (writableNode === undefined) {
        writableNode = lexicalNode.getWritable();
      }

      writableNode[property] = nextValue;
    }
  }
}

export function syncPropertiesFromLexical(
  binding: Binding,
  sharedType: XmlText | YMap<unknown> | XmlElement,
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

  const EditorClass = binding.editor.constructor;

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const prevValue =
      prevLexicalNode === null ? undefined : prevLexicalNode[property];
    let nextValue = nextLexicalNode[property];

    if (prevValue !== nextValue) {
      if (nextValue instanceof EditorClass) {
        const yjsDocMap = binding.docMap;
        let prevDoc;

        if (prevValue instanceof EditorClass) {
          // @ts-expect-error Lexical node
          const prevKey = prevValue._key;
          prevDoc = yjsDocMap.get(prevKey);
          yjsDocMap.delete(prevKey);
        }

        // If we already have a document, use it.
        const doc = prevDoc || new Doc();
        const key = doc.guid;
        // @ts-expect-error Lexical node
        nextValue._key = key;
        yjsDocMap.set(key, doc);
        nextValue = doc;
        // Mark the node dirty as we've assigned a new key to it
        binding.editor.update(() => {
          nextLexicalNode.markDirty();
        });
      }

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
  length: number;
  node:
    | CollabElementNode
    | CollabTextNode
    | CollabDecoratorNode
    | CollabLineBreakNode
    | null;
  nodeIndex: number;
  offset: number;
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

      const diffLength = index - offset;
      return {
        length: diffLength,
        node: child,
        nodeIndex: i,
        offset: textOffset,
      };
    }

    if (index > offset) {
      return {
        length: 0,
        node: child,
        nodeIndex: i,
        offset: childOffset,
      };
    } else if (i === childrenLength - 1) {
      return {
        length: 0,
        node: null,
        nodeIndex: i + 1,
        offset: childOffset + 1,
      };
    }
  }

  return {
    length: 0,
    node: null,
    nodeIndex: 0,
    offset: 0,
  };
}

export function doesSelectionNeedRecovering(
  selection: RangeSelection,
): boolean {
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

export function syncWithTransaction(binding: Binding, fn: () => void): void {
  binding.doc.transact(fn, binding);
}

export function createChildrenArray(
  element: ElementNode,
  nodeMap: null | NodeMap,
): Array<NodeKey> {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node =
      nodeMap === null ? $getNodeByKey(nodeKey) : nodeMap.get(nodeKey);
    if (node === null || node === undefined) {
      invariant(false, 'createChildrenArray: node does not exist in nodeMap');
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}

export function removeFromParent(node: LexicalNode): void {
  const oldParent = node.getParent();
  if (oldParent !== null) {
    const writableNode = node.getWritable();
    const writableParent = oldParent.getWritable();
    const prevSibling = node.getPreviousSibling();
    const nextSibling = node.getNextSibling();
    // TODO: this function duplicates a bunch of operations, can be simplified.
    if (prevSibling === null) {
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableParent.__first = nextSibling.__key;
        writableNextSibling.__prev = null;
      } else {
        writableParent.__first = null;
      }
    } else {
      const writablePrevSibling = prevSibling.getWritable();
      if (nextSibling !== null) {
        const writableNextSibling = nextSibling.getWritable();
        writableNextSibling.__prev = writablePrevSibling.__key;
        writablePrevSibling.__next = writableNextSibling.__key;
      } else {
        writablePrevSibling.__next = null;
      }
      writableNode.__prev = null;
    }
    if (nextSibling === null) {
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writableParent.__last = prevSibling.__key;
        writablePrevSibling.__next = null;
      } else {
        writableParent.__last = null;
      }
    } else {
      const writableNextSibling = nextSibling.getWritable();
      if (prevSibling !== null) {
        const writablePrevSibling = prevSibling.getWritable();
        writablePrevSibling.__next = writableNextSibling.__key;
        writableNextSibling.__prev = writablePrevSibling.__key;
      } else {
        writableNextSibling.__prev = null;
      }
      writableNode.__next = null;
    }
    writableParent.__size--;
    writableNode.__parent = null;
  }
}
