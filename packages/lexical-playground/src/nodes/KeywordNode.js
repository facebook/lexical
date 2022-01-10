/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode} from 'lexical';

import {TextNode} from 'lexical';

export class KeywordNode extends TextNode {
  static getType(): string {
    return 'keyword';
  }

  static clone(node: KeywordNode): KeywordNode {
    return new KeywordNode(node.__text, node.__key);
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.cursor = 'default';
    dom.className = 'keyword';
    return dom;
  }
}

export function $createKeywordNode(keyword: string): KeywordNode {
  return new KeywordNode(keyword).setMode('segmented');
}

export function $isKeywordNode(node: ?LexicalNode): boolean %checks {
  return node instanceof KeywordNode;
}
