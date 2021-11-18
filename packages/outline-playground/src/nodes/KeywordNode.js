/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, OutlineNode} from 'outline';

import {TextNode} from 'outline';

export class KeywordNode extends TextNode {
  __keyword: string;

  static clone(node: KeywordNode): KeywordNode {
    return new KeywordNode(node.__text, node.__key);
  }

  constructor(keyword: string, key?: NodeKey) {
    super(keyword, key);
    this.__type = 'keyword';
  }
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cursor = 'default';
    dom.className = 'keyword';
    return dom;
  }
}

export function createKeywordNode(keyword: string): KeywordNode {
  return new KeywordNode(keyword).makeSegmented();
}

export function isKeywordNode(node: null | OutlineNode): boolean %checks {
  return node instanceof KeywordNode;
}
