/**
 * (c) Facebook, Inc. and its affiliates. Confidential and proprietary.
 *
 * @emails oncall+unified_editor
 * @flow strict-local
 * @format
 */

'use strict';

import type {EditorConfig, NodeKey} from 'outline';

import {BlockNode} from 'outline';

// import stylex from 'stylex';

// const styles = stylex.create({
//   table: {
//     borderCollapse: 'collapse',
//     borderSpacing: 0,
//     maxWidth: '100%',
//     overflowY: 'scroll',
//     tableLayout: 'fixed',
//     width: '100%',
//   },
// });

export class OutlineTableNode extends BlockNode {
  static getType(): string {
    return 'table';
  }

  static clone(node: OutlineTableNode): OutlineTableNode {
    return new OutlineTableNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM<EditorContext>(_config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('table');

    // element.classList.add(...stylex(styles.table).split(' '));

    return element;
  }

  updateDOM(): boolean {
    return false;
  }
}

export function createOutlineTableNode(): OutlineTableNode {
  return new OutlineTableNode();
}

export function isOutlineTableNode(node: BlockNode): boolean {
  return node instanceof OutlineTableNode;
}
