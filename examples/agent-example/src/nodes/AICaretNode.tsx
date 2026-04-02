/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMExportOutput} from 'lexical';
import type {JSX} from 'react';

import {ReactExtension} from '@lexical/react/ReactExtension';
import {$create, DecoratorNode, defineExtension, LexicalNode} from 'lexical';

export class AICaretNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('ai-caret', {
      extends: DecoratorNode,
    });
  }

  exportDOM(): DOMExportOutput {
    return {element: null};
  }

  excludeFromCopy(): boolean {
    return true;
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'inline';
    return span;
  }

  isInline(): boolean {
    return true;
  }

  getTextContent(): string {
    return '';
  }

  decorate(): JSX.Element {
    return (
      <span
        className="inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-indigo-500 dark:bg-indigo-400"
        aria-hidden="true"
      />
    );
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
  dependencies: [ReactExtension],
  name: '@lexical/agent-example/ai-caret-node',
  nodes: () => [AICaretNode],
});
