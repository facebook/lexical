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

import {BlockNode} from 'Outline';

export class OutlineTableRowNode extends BlockNode {
  static getType(): string {
    return 'table-row';
  }

  static clone(node: OutlineTableRowNode): OutlineTableRowNode {
    return new OutlineTableRowNode(node.__key);
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
}

export function createOutlineTableRowNode(): OutlineTableRowNode {
  return new OutlineTableRowNode();
}

export function isOutlineTableRowNode(node: OutlineNode): boolean {
  return node instanceof OutlineTableRowNode;
}
