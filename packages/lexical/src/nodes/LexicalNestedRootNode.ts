/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, SerializedLexicalNode} from '../LexicalNode';
import type {SerializedElementNode} from './LexicalElementNode';

import invariant from 'shared/invariant';

import {KlassConstructor} from '../LexicalEditor';
import {$applyNodeReplacement} from '../LexicalUtils';
import {RootNodeBase} from './LexicalRootNodeBase';

export type SerializedRootNode<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> = SerializedElementNode<T>;

/** @noInheritDoc */
export class EXPERIMENTAL_NestedRootNode extends RootNodeBase {
  ['constructor']!: KlassConstructor<typeof EXPERIMENTAL_NestedRootNode>;

  static getType(): string {
    return 'nestedroot';
  }

  static clone(node: EXPERIMENTAL_NestedRootNode): EXPERIMENTAL_NestedRootNode {
    return new EXPERIMENTAL_NestedRootNode(node.__key);
  }

  insertBefore(nodeToInsert: EXPERIMENTAL_NestedRootNode): LexicalNode {
    invariant(
      $isNestedRootNode(nodeToInsert),
      'insertBefore: only nested root nodes can be inserted',
    );
    return super.insertBefore(nodeToInsert);
  }

  insertAfter(nodeToInsert: EXPERIMENTAL_NestedRootNode): LexicalNode {
    invariant(
      $isNestedRootNode(nodeToInsert),
      'insertAfter: only nested root nodes can be inserted',
    );
    return super.insertBefore(nodeToInsert);
  }

  // View
  // Mutate

  static importJSON(
    serializedNode: SerializedRootNode,
  ): EXPERIMENTAL_NestedRootNode {
    const node = new EXPERIMENTAL_NestedRootNode();
    node.setFormat(serializedNode.format);
    node.setIndent(serializedNode.indent);
    node.setDirection(serializedNode.direction);
    return node;
  }

  exportJSON(): SerializedRootNode {
    return {
      children: [],
      direction: this.getDirection(),
      format: this.getFormatType(),
      indent: this.getIndent(),
      type: 'nestedroot',
      version: 1,
    };
  }
}

export function $createNestedRootNode(): EXPERIMENTAL_NestedRootNode {
  return $applyNodeReplacement(new EXPERIMENTAL_NestedRootNode());
}

export function $isNestedRootNode(
  node: EXPERIMENTAL_NestedRootNode | LexicalNode | null | undefined,
): node is EXPERIMENTAL_NestedRootNode {
  return node instanceof EXPERIMENTAL_NestedRootNode;
}
