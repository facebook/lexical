/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalCommand,
  LexicalNode,
  SerializedLexicalNode,
} from 'lexical';

import {createCommand, DecoratorNode} from 'lexical';
import * as React from 'react';

export type SerializedHorizontalRuleNode = SerializedLexicalNode & {
  type: 'horizontalrule',
  version: 1,
};

export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> =
  createCommand();

function HorizontalRuleComponent() {
  return <hr />;
}

export class HorizontalRuleNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'horizontalrule';
  }

  static clone(node: HorizontalRuleNode): HorizontalRuleNode {
    return new HorizontalRuleNode(node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      hr: (node: Node) => ({
        conversion: convertHorizontalRuleElement,
        priority: 0,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    return {element: document.createElement('hr')};
  }

  static importJSON(
    serializedNode: SerializedHorizontalRuleNode,
  ): HorizontalRuleNode {
    return $createHorizontalRuleNode();
  }

  exportJSON(): SerializedLexicalNode {
    return {
      type: 'horizontalrule',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.style.display = 'contents';
    return div;
  }

  getTextContent(): '\n' {
    return '\n';
  }

  isTopLevel(): true {
    return true;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <HorizontalRuleComponent />;
  }
}

function convertHorizontalRuleElement(): DOMConversionOutput {
  return {node: $createHorizontalRuleNode()};
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): node is HorizontalRuleNode {
  return node instanceof HorizontalRuleNode;
}
