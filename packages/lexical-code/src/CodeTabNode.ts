/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  SerializedTabNode,
  TextNode,
} from 'lexical';

import {$applyNodeReplacement, TabNode} from 'lexical';

export type SerializedCodeTabNode = SerializedTabNode;

/** @noInheritDoc */
export class CodeTabNode extends TabNode {
  static getType(): string {
    return 'code-tab';
  }

  static clone(node: CodeTabNode): CodeTabNode {
    return new CodeTabNode(node.__key);
  }

  static importJSON(_serializedTabNode: SerializedCodeTabNode): CodeTabNode {
    return $createCodeTabNode();
  }

  exportJSON(): SerializedTabNode {
    return {
      ...super.exportJSON(),
      type: 'code-tab',
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = super.createDOM(config);
    // TODO pass through theme
    span.style.letterSpacing = '15px';
    const text = span.firstChild;
    if (text !== null) {
      span.replaceChild(document.createTextNode(' '), text);
    }
    return span;
  }

  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    return true;
  }
}

export function $createCodeTabNode(): CodeTabNode {
  return $applyNodeReplacement(new CodeTabNode());
}

export function $isCodeTabNode(
  node: LexicalNode | null | undefined,
): node is CodeTabNode {
  return node instanceof CodeTabNode;
}
