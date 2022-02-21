/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {GridCellNode} from 'lexical';

export class TableCellNode extends GridCellNode {
  __isHeader: boolean;

  static getType(): 'tablecell' {
    return 'tablecell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(false, node.__colSpan, node.__key);
  }

  constructor(
    isHeader?: boolean = false,
    colSpan?: number = 1,
    key?: NodeKey,
  ): void {
    super(colSpan, key);
    this.__isHeader = isHeader;
  }

  getTag(): string {
    return this.__isHeader ? 'th' : 'td';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement(this.getTag());

    addClassNamesToElement(
      element,
      config.theme.tableCell,
      this.__isHeader === true && config.theme.tableCellHeader,
    );

    return element;
  }

  updateDOM(): boolean {
    return false;
  }

  collapseAtStart(): true {
    return true;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function $createTableCellNode(isHeader: boolean): TableCellNode {
  return new TableCellNode(isHeader);
}

export function $isTableCellNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableCellNode;
}
