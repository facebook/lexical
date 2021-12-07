/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, State} from 'outline';

import {useEffect} from 'react';
import {TextNode} from 'outline';
import {isParagraphNode} from 'outline/ParagraphNode';
import {otlnCreateListItemNode} from 'outline/ListItemNode';
import {otlnCreateHeadingNode} from 'outline/HeadingNode';
import {otlnCreateListNode} from 'outline/ListNode';
import {otlnCreateQuoteNode} from 'outline/QuoteNode';

function updateTextNode(node: TextNode, count: number): void {
  const textNode = node.spliceText(0, count, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }
}

function textNodeTransform(node: TextNode, state: State): void {
  const element = node.getParentOrThrow();

  if (
    element !== null &&
    node.getPreviousSibling() === null &&
    isParagraphNode(element)
  ) {
    const textContent = node.getTextContent();
    const firstChar = textContent[0];
    const secondChar = textContent[1];
    const thirdChar = textContent[2];

    if (textContent.length > 1 && secondChar === ' ') {
      if (firstChar === '#') {
        updateTextNode(node, 2);
        const heading = otlnCreateHeadingNode('h1');
        const children = element.getChildren();
        heading.append(...children);
        element.replace(heading);
      } else if (firstChar === '>') {
        updateTextNode(node, 2);
        const quote = otlnCreateQuoteNode();
        const children = element.getChildren();
        quote.append(...children);
        element.replace(quote);
      } else if (firstChar === '-' || firstChar === '*') {
        updateTextNode(node, 2);
        const list = otlnCreateListNode('ul');
        const listItem = otlnCreateListItemNode();
        const children = element.getChildren();
        listItem.append(...children);
        list.append(listItem);
        element.replace(list);
      }
    } else if (textContent.length > 2) {
      if (firstChar === '#' && secondChar === '#' && thirdChar === ' ') {
        updateTextNode(node, 3);
        const heading = otlnCreateHeadingNode('h2');
        const children = element.getChildren();
        heading.append(...children);
        element.replace(heading);
      } else if (parseInt(firstChar, 10)) {
        const match = textContent.match(/^(\d+)\.\s/);
        if (match !== null && match.index === 0 && match.length === 2) {
          const start = parseInt(match[1], 10);
          updateTextNode(node, match[0].length);
          const list = otlnCreateListNode('ol', start);
          const listItem = otlnCreateListItemNode();
          const children = element.getChildren();
          listItem.append(...children);
          list.append(listItem);
          element.replace(list);
        }
      }
    }
  }
}

export default function useOutlineAutoFormatter(editor: OutlineEditor): void {
  useEffect(() => {
    return editor.addTransform(TextNode, textNodeTransform);
  }, [editor]);
}
