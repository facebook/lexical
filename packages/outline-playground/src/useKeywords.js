/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, NodeKey, TextNode} from 'outline';

import * as React from 'react';
import {useEffect} from 'react';
import {DecoratorNode} from 'outline';

const keywords = new Set(['congrats', 'congratulations']);

export default function useKeywords(editor: OutlineEditor): void {
  useEffect(() => {
    editor.registerNodeType('keyword', KeywordNode);
    return editor.addTextNodeTransform((node: TextNode) => {
      if (!node.isSimpleText()) {
        return;
      }
      const text = node.getTextContent();
      // TODO this only works if there is only the keyword in the editor.
      // we should make it work more effectively.
      if (keywords.has(text)) {
        const keywordNode = createKeywordNode(text);
        node.replace(keywordNode);
        keywordNode.selectNext(0, 0);
      }
    });
  }, [editor]);
}

function Keyword({children}: {children: string}): React.MixedElement {
  return <span className="keyword">{children}</span>;
}

class KeywordNode extends DecoratorNode {
  __keyword: string;

  constructor(keyword: string, key?: NodeKey) {
    super(key);
    this.__type = 'keyword';
    this.__keyword = keyword;
  }
  clone(): KeywordNode {
    return new KeywordNode(this.__keyword, this.__key);
  }
  getTextContent(): string {
    return this.__keyword;
  }
  createDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.style.cursor = 'default';
    return dom;
  }
  updateDOM(): boolean {
    return false;
  }
  decorate() {
    return <Keyword>{this.__keyword}</Keyword>;
  }
}

function isKeywordNode(node: TextNode): boolean {
  return node instanceof KeywordNode;
}

function createKeywordNode(keyword: string): KeywordNode {
  return new KeywordNode(keyword);
}
