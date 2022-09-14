/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from '../LexicalNode';
import type {SerializedElementNode} from './LexicalElementNode';

import invariant from 'shared/invariant';

import {NO_DIRTY_NODES} from '../LexicalConstants';
import {getActiveEditor, isCurrentlyReadOnlyMode} from '../LexicalUpdates';
import {$getRoot} from '../LexicalUtils';
import {$isDecoratorNode} from './LexicalDecoratorNode';
import {$isElementNode, ElementNode} from './LexicalElementNode';

export type SerializedRootNode = SerializedElementNode;

/** @noInheritDoc */
export class RootNode extends ElementNode {
  /** @internal */
  __cachedText: null | string;

  static getType(): string {
    return 'root';
  }

  static clone(): RootNode {
    return new RootNode();
  }

  constructor() {
    super('root');
    this.__cachedText = null;
  }

  getTopLevelElementOrThrow(): never {
    invariant(
      false,
      'getTopLevelElementOrThrow: root nodes are not top level elements',
    );
  }

  getTextContent(): string {
    const cachedText = this.__cachedText;
    if (
      isCurrentlyReadOnlyMode() ||
      getActiveEditor()._dirtyType === NO_DIRTY_NODES
    ) {
      if (cachedText !== null) {
        return cachedText;
      }
    }
    return super.getTextContent();
  }

  remove(): never {
    invariant(false, 'remove: cannot be called on root nodes');
  }

  replace<N = LexicalNode>(node: N): never {
    invariant(false, 'replace: cannot be called on root nodes');
  }

  insertBefore(nodeToInsert: LexicalNode): LexicalNode {
    invariant(false, 'insertBefore: cannot be called on root nodes');
  }

  insertAfter(nodeToInsert: LexicalNode): LexicalNode {
    invariant(false, 'insertAfter: cannot be called on root nodes');
  }

  // View

  updateDOM(prevNode: RootNode, dom: HTMLElement): false {
    return false;
  }

  // Mutate

  append(...nodesToAppend: LexicalNode[]): this {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const node = nodesToAppend[i];
      if (!$isElementNode(node) && !$isDecoratorNode(node)) {
        invariant(
          false,
          'rootNode.append: Only element or decorator nodes can be appended to the root node',
        );
      }
    }
    return super.append(...nodesToAppend);
  }

  static importJSON(serializedNode: SerializedRootNode): RootNode {
    // We don't create a root, and instead use the existing root.
    const node = $getRoot();
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
      type: 'root',
      version: 1,
    };
  }
}

export function $createRootNode(): RootNode {
  return new RootNode();
}

export function $isRootNode(
  node: RootNode | LexicalNode | null | undefined,
): node is RootNode {
  return node instanceof RootNode;
}
