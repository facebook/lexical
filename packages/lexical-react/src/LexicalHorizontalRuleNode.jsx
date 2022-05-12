/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  LexicalCommand,
  LexicalNode,
} from 'lexical';

import {createCommand, DecoratorNode} from 'lexical';
import * as React from 'react';

export interface SerializedHorizontalRuleNode {
  type: 'horizontalrule';
}

export const INSERT_HORIZONTAL_RULE_COMMAND: LexicalCommand<void> =
  createCommand();

function HorizontalRuleComponent() {
  return <hr />;
}

export class HorizontalRuleNode extends DecoratorNode<React$Node> {
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

  exportJSON(): SerializedHorizontalRuleNode {
    return {
      type: 'horizontalrule',
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

  decorate(): React$Node {
    return <HorizontalRuleComponent />;
  }
}

function convertHorizontalRuleElement(): DOMConversionOutput {
  return {node: $createHorizontalRuleNode()};
}

export function $createHorizontalRuleNode(): HorizontalRuleNode {
  return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HorizontalRuleNode;
}
