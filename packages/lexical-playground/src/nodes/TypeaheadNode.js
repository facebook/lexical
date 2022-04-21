/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig} from 'lexical';

import {TextNode} from 'lexical';

export class TypeaheadNode extends TextNode {
  static clone(node: TypeaheadNode): TypeaheadNode {
    return new TypeaheadNode(node.__text, node.__key);
  }

  static getType(): 'typeahead' {
    return 'typeahead';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cssText = 'color: #ccc;';
    return dom;
  }
}

export function $createTypeaheadNode(text: string): TextNode {
  return new TypeaheadNode(text).setMode('inert');
}
