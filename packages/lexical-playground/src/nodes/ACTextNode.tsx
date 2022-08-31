/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// AC = Alternating Case

import type {Spread} from 'lexical';

import {LexicalNode, SerializedTextNode, TextNode} from 'lexical';

export type SerializedACTextNode = Spread<
  {
    type: 'ac-text';
    version: 1;
  },
  SerializedTextNode
>;

export class ACTextNode extends TextNode {
  static getType(): string {
    return 'ac-text';
  }

  static clone(node: ACTextNode): ACTextNode {
    return new ACTextNode(node.__text, node.__key);
  }

  static importJSON(serializedNode: SerializedACTextNode): ACTextNode {
    const node = $createACTextNode(serializedNode.text);
    node.setTextContent(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  setTextContent(text: string): this {
    const a = 'a'.charCodeAt(0);
    const A = 'A'.charCodeAt(0);
    const z = 'z'.charCodeAt(0);
    const Z = 'Z'.charCodeAt(0);
    const aADiff = a - A;
    const textLength = text.length;
    let acText = '';
    let isOdd = true;
    for (let i = 0; i < textLength; i++) {
      const code = text.charCodeAt(i);
      if (!isOdd && code >= a && code <= z) {
        acText += String.fromCharCode(code - aADiff);
      } else if (isOdd && code >= A && code <= Z) {
        acText += String.fromCharCode(code + aADiff);
      } else {
        acText += text.charAt(i);
      }
      isOdd = !isOdd;
    }
    // @ts-ignore[2322] do better
    return TextNode.prototype.setTextContent.call(this, acText);
  }

  exportJSON(): SerializedACTextNode {
    return {
      ...super.exportJSON(),
      type: 'ac-text',
      version: 1,
    };
  }
}

export function $createACTextNode(acTextName: string): ACTextNode {
  return new ACTextNode(acTextName);
}

export function $isACTextNode(
  node: LexicalNode | null | undefined,
): node is ACTextNode {
  return node instanceof ACTextNode;
}
