/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  RangeSelection,
  SerializedElementNode,
} from 'lexical';

import {$applyNodeReplacement, ElementNode} from 'lexical';

export type SerializedOverflowNode = SerializedElementNode;

/** @noInheritDoc */
export class OverflowNode extends ElementNode {
  /** @internal */
  $config() {
    return this.config('overflow', {
      $transform(node: OverflowNode) {
        if (node.isEmpty()) {
          node.remove();
        }
      },
      extends: ElementNode,
    });
  }

  createDOM(config: EditorConfig): HTMLElement {
    const div = document.createElement('span');
    const className = config.theme.characterLimit;
    if (typeof className === 'string') {
      div.className = className;
    }
    return div;
  }

  updateDOM(prevNode: this, dom: HTMLElement): boolean {
    return false;
  }

  insertNewAfter(
    selection: RangeSelection,
    restoreSelection = true,
  ): null | LexicalNode {
    const parent = this.getParentOrThrow();
    return parent.insertNewAfter(selection, restoreSelection);
  }

  excludeFromCopy(): boolean {
    return true;
  }
}

export function $createOverflowNode(): OverflowNode {
  return $applyNodeReplacement(new OverflowNode());
}

export function $isOverflowNode(
  node: LexicalNode | null | undefined,
): node is OverflowNode {
  return node instanceof OverflowNode;
}
