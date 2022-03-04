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

export type TableCellHeaderStyles = Set<'row' | 'column'>;

export class TableCellNode extends GridCellNode {
  __headerStyles: TableCellHeaderStyles;

  static getType(): 'tablecell' {
    return 'tablecell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(
      new Set(node.__headerStyles),
      node.__colSpan,
      node.__key,
    );
  }

  constructor(
    headerStyles?: TableCellHeaderStyles,
    colSpan?: number = 1,
    key?: NodeKey,
  ): void {
    super(colSpan, key);
    this.__headerStyles = headerStyles || new Set();
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement(this.getTag());

    addClassNamesToElement(
      element,
      config.theme.tableCell,
      this.hasHeader() && config.theme.tableCellHeader,
    );

    return element;
  }

  getTag(): string {
    return this.hasHeader() ? 'th' : 'td';
  }

  setHeaderStyles(headerStyles: TableCellHeaderStyles): TableCellHeaderStyles {
    const self = this.getWritable();
    self.__headerStyles = new Set(headerStyles);
    return this.__headerStyles;
  }

  getHeaderStyles(): TableCellHeaderStyles {
    return this.getLatest().__headerStyles;
  }

  toggleHeaderStyle(key: 'row' | 'column'): TableCellNode {
    const self = this.getWritable();

    const newHeaderValue = self.getHeaderStyles();

    if (newHeaderValue.has(key)) {
      newHeaderValue.delete(key);
    } else {
      newHeaderValue.add(key);
    }

    self.__headerStyles = new Set(newHeaderValue);

    return self;
  }

  hasHeader(): boolean {
    const headerStyles = this.getLatest().__headerStyles;
    return headerStyles.size > 0;
  }

  updateDOM(prevNode: TableCellNode): boolean {
    return prevNode.__headerStyles.size !== this.__headerStyles.size;
  }

  collapseAtStart(): true {
    return true;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function $createTableCellNode(
  headerStyles: TableCellHeaderStyles,
): TableCellNode {
  return new TableCellNode(headerStyles);
}

export function $isTableCellNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableCellNode;
}
