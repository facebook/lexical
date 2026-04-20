/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalNode} from 'lexical';

import {$isHeadingNode} from '@lexical/rich-text';
import {
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
} from 'lexical';

export function $findNodeContaining(search: string): LexicalNode | null {
  const root = $getRoot();
  return $findInChildren(root.getChildren(), search);
}

function $findInChildren(
  nodes: LexicalNode[],
  search: string,
): LexicalNode | null {
  for (const node of nodes) {
    if ($isDecoratorNode(node)) {
      const text = node.getTextContent();
      if (text.includes(search)) {
        return node;
      }
      continue;
    }
    if ($isElementNode(node)) {
      const text = node.getTextContent();
      if (text.includes(search)) {
        const children = node.getChildren();
        const hasElementChildren = children.some((c) => $isElementNode(c));
        if (!hasElementChildren) {
          return node;
        }
        const found = $findInChildren(children, search);
        if (found) {
          return found;
        }
      }
    }
  }
  return null;
}

interface SerializedDocNode {
  type: string;
  text: string;
  tag?: string;
  children?: SerializedDocNode[];
}

export function $serializeDocumentForAI(): SerializedDocNode[] {
  const root = $getRoot();
  return $serializeChildren(root);
}

function $serializeChildren(parent: ElementNode): SerializedDocNode[] {
  const result: SerializedDocNode[] = [];
  for (const child of parent.getChildren()) {
    const serialized = $serializeNode(child);
    if (serialized) {
      result.push(serialized);
    }
  }
  return result;
}

function $serializeNode(node: LexicalNode): SerializedDocNode | null {
  if ($isDecoratorNode(node)) {
    return {
      text: node.getTextContent(),
      type: node.getType(),
    };
  }
  if ($isElementNode(node)) {
    const nodeType = node.getType();
    const children = node.getChildren();
    const hasElementChildren = children.some((c) => $isElementNode(c));

    if (hasElementChildren) {
      return {
        children: $serializeChildren(node),
        text: node.getTextContent(),
        type: nodeType,
      };
    }

    const result: SerializedDocNode = {
      text: node.getTextContent(),
      type: nodeType,
    };

    if ($isHeadingNode(node)) {
      result.tag = node.getTag();
    }

    return result;
  }
  return null;
}

export function $getSelectedText(): string | null {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    return selection.getTextContent();
  }
  return null;
}
