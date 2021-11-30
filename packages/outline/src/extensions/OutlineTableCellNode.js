/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @emails oncall+unified_editor
 * @flow strict-local
 * @format
 */

'use strict';

import type {OutlineNode} from '../core/OutlineNode';
import type {EditorConfig, NodeKey} from 'outline';

import {BlockNode} from 'outline';

export class OutlineTableCellNode extends BlockNode {
  __isHeader: boolean;

  static getType(): string {
    return 'table-cell';
  }

  static clone(node: OutlineTableCellNode): OutlineTableCellNode {
    return new OutlineTableCellNode(false, node.__key);
  }

  constructor(isHeader?: boolean = false, key?: NodeKey) {
    super(key);
    this.__isHeader = isHeader;
  }

  getTag(): string {
    return this.__isHeader ? 'th' : 'td';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement(this.getTag());

    if (config.theme.tableCell != null) {
      element.classList.add(config.theme.tableCell);
    }

    if (this.__isHeader === true && config.theme.tableCellHeader) {
      element.classList.add(config.theme.tableCellHeader);
    }

    return element;
  }

  updateDOM(): boolean {
    return false;
  }
}

export function createOutlineTableCellNode(
  isHeader: boolean,
): OutlineTableCellNode {
  return new OutlineTableCellNode(isHeader);
}

export function isOutlineTableCellNode(node: OutlineNode): boolean {
  return node instanceof OutlineTableCellNode;
}
