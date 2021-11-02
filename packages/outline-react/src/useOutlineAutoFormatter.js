/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, State} from 'outline';
import type {TextNode} from 'outline';

import {useEffect} from 'react';
import {isParagraphNode} from 'outline/ParagraphNode';
import {createListItemNode} from 'outline/ListItemNode';
import {createHeadingNode} from 'outline/HeadingNode';
import {createListNode} from 'outline/ListNode';
import {createQuoteNode} from 'outline/QuoteNode';

function updateTextNode(node: TextNode, count: number): void {
  const textNode = node.spliceText(0, count, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }
}

function textNodeTransform(node: TextNode, state: State): void {
  const block = node.getParentBlockOrThrow();

  if (
    block !== null &&
    node.getPreviousSibling() === null &&
    isParagraphNode(block)
  ) {
    const textContent = node.getTextContent();
    const firstChar = textContent[0];
    const secondChar = textContent[1];
    const thirdChar = textContent[2];

    if (textContent.length > 1 && secondChar === ' ') {
      if (firstChar === '#') {
        updateTextNode(node, 2);
        const heading = createHeadingNode('h1');
        const children = block.getChildren();
        heading.append(...children);
        block.replace(heading);
      } else if (firstChar === '>') {
        updateTextNode(node, 2);
        const quote = createQuoteNode();
        const children = block.getChildren();
        quote.append(...children);
        block.replace(quote);
      } else if (firstChar === '-' || firstChar === '*') {
        updateTextNode(node, 2);
        const list = createListNode('ul');
        const listItem = createListItemNode();
        const children = block.getChildren();
        listItem.append(...children);
        list.append(listItem);
        block.replace(list);
      }
    } else if (textContent.length > 2 && thirdChar === ' ') {
      if (firstChar === '#' && secondChar === '#') {
        updateTextNode(node, 3);
        const heading = createHeadingNode('h2');
        const children = block.getChildren();
        heading.append(...children);
        block.replace(heading);
      } else if (firstChar === '1' && secondChar === '.') {
        updateTextNode(node, 3);
        const list = createListNode('ol');
        const listItem = createListItemNode();
        const children = block.getChildren();
        listItem.append(...children);
        list.append(listItem);
        block.replace(list);
      }
    }
  }
}

export default function useOutlineAutoFormatter(editor: OutlineEditor): void {
  useEffect(() => {
    return editor.addTextNodeTransform(textNodeTransform);
  }, [editor]);
}
