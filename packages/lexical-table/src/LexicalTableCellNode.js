/* eslint-disable sort-keys-fix/sort-keys-fix */
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
import {GridCellNode} from 'lexical';

export const TableCellHeaderStates = {
  NO_STATUS: 0,
  ROW: 1,
  COLUMN: 2,
  BOTH: 3,
};

export type TableCellHeaderState = $Values<typeof TableCellHeaderStates>;

export class TableCellNode extends GridCellNode {
  __headerState: TableCellHeaderState;

  static getType(): 'tablecell' {
    return 'tablecell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(node.__headerState, node.__colSpan, node.__key);
  }

  constructor(
    headerState?: TableCellHeaderState = TableCellHeaderStates.NO_STATUS,
    colSpan?: number = 1,
    key?: NodeKey,
  ): void {
    super(colSpan, key);
    this.__headerState = headerState;
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

  setHeaderStyles(headerState: TableCellHeaderState): TableCellHeaderState {
    const self = this.getWritable();
    self.__headerState = headerState;
    return this.__headerState;
  }

  getHeaderStyles(): TableCellHeaderState {
    return this.getLatest().__headerState;
  }

  toggleHeaderStyle(headerStateToToggle: TableCellHeaderState): TableCellNode {
    const self = this.getWritable();

    if ((self.__headerState & headerStateToToggle) === headerStateToToggle) {
      self.__headerState -= headerStateToToggle;
    } else {
      self.__headerState += headerStateToToggle;
    }

    self.__headerState = self.__headerState;

    return self;
  }

  hasHeaderState(headerState: TableCellHeaderState): boolean {
    return (this.getHeaderStyles() & headerState) === headerState;
  }

  hasHeader(): boolean {
    return this.getLatest().__headerState !== TableCellHeaderStates.NO_STATUS;
  }

  updateDOM(prevNode: TableCellNode): boolean {
    return prevNode.__headerState !== this.__headerState;
  }

  collapseAtStart(): true {
    return true;
  }

  canBeEmpty(): false {
    return false;
  }
}

export function $createTableCellNode(
  headerState: TableCellHeaderState,
): TableCellNode {
  return new TableCellNode(headerState);
}

export function $isTableCellNode(node: ?LexicalNode): boolean %checks {
  return node instanceof TableCellNode;
}
