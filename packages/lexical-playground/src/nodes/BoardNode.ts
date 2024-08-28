/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {DecoratorNode, DOMExportOutput, LexicalNode, NodeKey} from 'lexical';
import React from 'react';

import Board from '../plugins/BoardPlugin/board';

export class KanbanNode extends DecoratorNode<React.ReactElement> {
  static getType(): string {
    return 'kanban';
  }

  static clone(node: KanbanNode): KanbanNode {
    return new KanbanNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const elem = document.createElement('div');
    elem.style.display = 'block';
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-kanban', 'true');
    return {element};
  }

  decorate(): React.ReactElement {
    return React.createElement(Board);
  }
}

export function $createKanbanNode(): KanbanNode {
  return new KanbanNode();
}

export function $isKanbanNode(
  node: LexicalNode | null | undefined,
): node is KanbanNode {
  return node instanceof KanbanNode;
}
