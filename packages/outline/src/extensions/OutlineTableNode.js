/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, OutlineNode, NodeKey} from 'outline';

import {ElementNode} from 'outline';

export class TableNode extends ElementNode {
  static getType(): string {
    return 'table';
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('table');

    if (config.theme.table != null) {
      element.classList.add(config.theme.table);
    }

    return element;
  }

  updateDOM(): boolean {
    return false;
  }
}

export function createTableNode(): TableNode {
  return new TableNode();
}

export function isTableNode(node: OutlineNode): boolean {
  return node instanceof TableNode;
}
