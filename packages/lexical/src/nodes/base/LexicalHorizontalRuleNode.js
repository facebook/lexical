/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from '../../LexicalNode';

import {LexicalNode} from '../../LexicalNode';

export class HorizontalRuleNode extends LexicalNode {
  static getType(): string {
    return 'horizontal-rule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  createDOM(): HTMLElement {
    const element = document.createElement('hr');
    element.setAttribute('contenteditable', 'false');
    return element;
  }

  updateDOM(): false {
    return false;
  }

  getChildrenSize(): number {
    return 0;
  }
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HorizontalRuleNode;
}
