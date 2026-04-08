/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMExportOutput, EditorConfig} from 'lexical';

import {$create, DecoratorNode, defineExtension, LexicalNode} from 'lexical';

export class AICaretNode extends DecoratorNode<unknown> {
  $config() {
    return this.config('ai-caret', {
      extends: DecoratorNode,
      importDOM: {},
    });
  }

  exportDOM(): DOMExportOutput {
    return {element: null};
  }

  excludeFromCopy(): boolean {
    return true;
  }

  updateDOM(
    _prevNode: unknown,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    return false;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.ariaHidden = 'true';
    span.dataset.aiCaretNode = 'true';
    span.className =
      'inline-block h-[1em] w-0.5 translate-y-0.5 rounded-full bg-indigo-500 dark:bg-indigo-400';
    span.style.animation = 'blink 0.8s step-end infinite';
    return span;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return '';
  }
}

export function $createAICaretNode(): AICaretNode {
  return $create(AICaretNode);
}

export function $isAICaretNode(
  node: LexicalNode | null | undefined,
): node is AICaretNode {
  return node instanceof AICaretNode;
}

export const AICaretNodeExtension = defineExtension({
  name: '@lexical/agent-example/ai-caret-node',
  nodes: () => [AICaretNode],
});
