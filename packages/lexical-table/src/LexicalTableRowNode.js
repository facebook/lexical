/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {GridRowNode} from 'lexical';

export class TableRowNode extends GridRowNode {
  static getType(): 'tablerow' {
    return 'tablerow';
  }

  static clone(node: TableRowNode): TableRowNode {
    return new TableRowNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('tr');

    addClassNamesToElement(element, config.theme.tableRow);

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function $createTableRowNode(): TableRowNode {
  return new TableRowNode();
}

export function $isTableRowNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableRowNode;
}
