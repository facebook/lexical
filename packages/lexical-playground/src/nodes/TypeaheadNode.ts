/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Spread} from 'lexical';

import {EditorConfig, SerializedTextNode, TextNode} from 'lexical';

export type SerializedTypeaheadNode = Spread<
  {
    type: 'typeahead';
    version: 1;
  },
  SerializedTextNode
>;

export class TypeaheadNode extends TextNode {
  static clone(node: TypeaheadNode): TypeaheadNode {
    return new TypeaheadNode(node.__text, node.__key);
  }

  static getType(): 'typeahead' {
    return 'typeahead';
  }

  static importJSON(serializedNode: SerializedTypeaheadNode): TypeaheadNode {
    const node = $createTypeaheadNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedTypeaheadNode {
    return {
      ...super.exportJSON(),
      type: 'typeahead',
      version: 1,
    };
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cssText = 'color: #ccc;';
    return dom;
  }
}

export function $createTypeaheadNode(text: string): TypeaheadNode {
  return new TypeaheadNode(text).setMode('inert');
}
