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
  NodeKey,
  SerializedTextNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {$applyNodeReplacement, TextNode} from 'lexical';

/** @noInheritDoc */
export class SpinNode extends TextNode {
  static getType(): string {
    return 'spin';
  }

  static clone(node: SpinNode): SpinNode {
    return new SpinNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.Spin);
    return element;
  }

  static importJSON(serializedNode: SerializedTextNode): SpinNode {
    const node = $createSpinNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: 'spin',
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

/**
 * Generates a SpinNode, which is a string following the format of a # followed by some text, eg. #lexical.
 * @param text - The text used inside the SpinNode.
 * @returns - The SpinNode with the embedded text.
 */
export function $createSpinNode(text = ''): SpinNode {
  return $applyNodeReplacement(new SpinNode(text));
}

/**
 * Determines if node is a SpinNode.
 * @param node - The node to be checked.
 * @returns true if node is a SpinNode, false otherwise.
 */
export function $isSpinNode(
  node: LexicalNode | null | undefined,
): node is SpinNode {
  return node instanceof SpinNode;
}
