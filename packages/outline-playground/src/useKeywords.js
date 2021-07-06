/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineEditor,
  NodeKey,
  TextNode,
  View,
} from 'outline';

import * as React from 'react';
import {useEffect, useCallback} from 'react';
import {DecoratorNode, createTextNode} from 'outline';
import {isHashtagNode} from 'outline/HashtagNode';

const keywords = new Set(['congrats', 'congratulations']);

export default function useKeywords(editor: OutlineEditor): void {
  useEffect(() => {
    editor.registerNodeType('keyword', KeywordNode);
    return editor.addTextNodeTransform((node: TextNode, view: View) => {
      if (isHashtagNode(node) || isKeywordNode(node)) {
        return;
      }
      const text = node.getTextContent();
      // TODO this only works if there is only the keyword in the editor.
      // we should make it work more effectively.
      if (keywords.has(text)) {
        const selection = view.getSelection();
        let anchorOffset = null;
        if (selection !== null && node === selection.getAnchorNode()) {
          anchorOffset = selection.anchorOffset;
        }
        const keywordNode = createKeywordNode(text, anchorOffset);
        node.replace(keywordNode);
        view.clearSelection();
      }
    });
  }, [editor]);
}

function Keyword({
  children,
  anchorOffset,
}: {
  children: string,
  anchorOffset: null | number,
}): React.MixedElement {
  const ref = useCallback(
    (node) => {
      if (node !== null && anchorOffset !== null) {
        const domSelection = window.getSelection();
        const child = node.firstChild;
        if (domSelection !== null && child !== null) {
          domSelection.setBaseAndExtent(
            child,
            anchorOffset,
            child,
            anchorOffset,
          );
        }
      }
    },
    [anchorOffset],
  );
  return (
    <span className="keyword" ref={ref}>
      {children}
    </span>
  );
}

class KeywordNode extends DecoratorNode {
  __keyword: string;
  __anchorOffset: null | number;

  constructor(keyword: string, anchorOffset: null | number, key?: NodeKey) {
    super(key);
    this.__keyword = keyword;
    this.__type = 'keyword';
    this.__anchorOffset = anchorOffset;
  }
  getTextContent(): string {
    return this.__keyword;
  }
  clone(): KeywordNode {
    return new KeywordNode(this.__keyword, this.__anchorOffset, this.__key);
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
    return (
      <Keyword anchorOffset={this.__anchorOffset}>{this.__keyword}</Keyword>
    );
  }
  undecorate(): TextNode {
    const domSelection = window.getSelection();
    const anchorOffset = domSelection.anchorOffset;
    const textNode = createTextNode(this.__keyword);
    textNode.select(anchorOffset, anchorOffset);
    return textNode;
  }
}

function isKeywordNode(node: TextNode): boolean {
  return node instanceof KeywordNode;
}

function createKeywordNode(
  keyword: string,
  anchorOffset: null | number,
): KeywordNode {
  // TODO we should not be using makeImmutable here really.
  return new KeywordNode(keyword, anchorOffset).makeImmutable();
}
