/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import {ElementNode} from 'lexical';

import {$createEquationNode} from '../EquationNode';

export class FigureNode extends ElementNode {
  $config() {
    return this.config('figure', {extends: ElementNode});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-figure-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }
}

export function $createFigureNode(): FigureNode {
  const node = new FigureNode();
  node.setSlot('media', $createEquationNode('E=mc^2', false));
  return node;
}

export function $isFigureNode(
  node: LexicalNode | null | undefined,
): node is FigureNode {
  return node instanceof FigureNode;
}
