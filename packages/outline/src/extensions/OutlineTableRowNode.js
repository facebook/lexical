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

export class TableRowNode extends ElementNode {
  static getType(): 'table-row' {
    return 'table-row';
  }

  static clone(node: TableRowNode): TableRowNode {
    return new TableRowNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('tr');

    if (config.theme.tableRow != null) {
      element.classList.add(config.theme.tableRow);
    }

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  canSelectionRemove(): boolean {
    return false;
  }
}

export function createTableRowNode(): TableRowNode {
  return new TableRowNode();
}

export function isTableRowNode(node: OutlineNode): boolean %checks {
  return node instanceof TableRowNode;
}
