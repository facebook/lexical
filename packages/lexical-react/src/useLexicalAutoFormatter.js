/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from '@lexical/core';

import {useEffect} from 'react';
import {TextNode} from '@lexical/core';
import {$isParagraphNode} from '@lexical/core/ParagraphNode';
import {$createListItemNode} from '@lexical/core/ListItemNode';
import {$createHeadingNode} from '@lexical/core/HeadingNode';
import {$createListNode} from '@lexical/core/ListNode';
import {$createQuoteNode} from '@lexical/core/QuoteNode';
import {$createCodeNode} from '@lexical/core/CodeNode';

function updateTextNode(node: TextNode, count: number): void {
  const textNode = node.spliceText(0, count, '', true);
  if (textNode.getTextContent() === '') {
    textNode.selectPrevious();
    textNode.remove();
  }
}

function textNodeTransform(node: TextNode): void {
  const element = node.getParentOrThrow();

  if (
    element !== null &&
    node.getPreviousSibling() === null &&
    $isParagraphNode(element)
  ) {
    const textContent = node.getTextContent();
    const firstChar = textContent[0];
    const secondChar = textContent[1];
    const thirdChar = textContent[2];

    if (textContent.length > 1 && secondChar === ' ') {
      if (firstChar === '#') {
        updateTextNode(node, 2);
        const heading = $createHeadingNode('h1');
        const children = element.getChildren();
        heading.append(...children);
        element.replace(heading);
      } else if (firstChar === '>') {
        updateTextNode(node, 2);
        const quote = $createQuoteNode();
        const children = element.getChildren();
        quote.append(...children);
        element.replace(quote);
      } else if (firstChar === '-' || firstChar === '*') {
        updateTextNode(node, 2);
        const list = $createListNode('ul');
        const listItem = $createListItemNode();
        const children = element.getChildren();
        listItem.append(...children);
        list.append(listItem);
        element.replace(list);
      }
    } else if (textContent.length > 2) {
      if (firstChar === '#' && secondChar === '#' && thirdChar === ' ') {
        updateTextNode(node, 3);
        const heading = $createHeadingNode('h2');
        const children = element.getChildren();
        heading.append(...children);
        element.replace(heading);
      } else if (parseInt(firstChar, 10)) {
        const match = textContent.match(/^(\d+)\.\s/);
        if (match !== null && match.index === 0 && match.length === 2) {
          const start = parseInt(match[1], 10);
          updateTextNode(node, match[0].length);
          const list = $createListNode('ol', start);
          const listItem = $createListItemNode();
          const children = element.getChildren();
          listItem.append(...children);
          list.append(listItem);
          element.replace(list);
        }
      } else if (firstChar === '`' && secondChar === '`' && thirdChar === '`') {
        updateTextNode(node, 3);
        const codeNode = $createCodeNode();
        codeNode.append(...element.getChildren());
        element.replace(codeNode);
      }
    }
  }
}

export default function useLexicalAutoFormatter(editor: LexicalEditor): void {
  useEffect(() => {
    return editor.addTransform(TextNode, textNodeTransform);
  }, [editor]);
}
