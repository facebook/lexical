/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';
import type {TextNode} from 'outline';

import {useEffect} from 'react';
import {isParagraphNode} from 'outline/ParagraphNode';
import {createListItemNode} from 'outline/ListItemNode';
import {createHeadingNode} from 'outline/HeadingNode';
import {createListNode} from 'outline/ListNode';
import {createQuoteNode} from 'outline/QuoteNode';

function textNodeTransform(node: TextNode, view: View): void {
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
        node.spliceText(0, 2, '', true);
        const heading = createHeadingNode('h1');
        const children = block.getChildren();
        children.forEach((child) => heading.append(child));
        block.replace(heading);
      } else if (firstChar === '>') {
        node.spliceText(0, 2, '', true);
        const quote = createQuoteNode();
        const children = block.getChildren();
        children.forEach((child) => quote.append(child));
        block.replace(quote);
      } else if (firstChar === '-' || firstChar === '*') {
        node.spliceText(0, 2, '', true);
        const list = createListNode('ul');
        const listItem = createListItemNode();
        const children = block.getChildren();
        children.forEach((child) => listItem.append(child));
        list.append(listItem);
        block.replace(list);
      }
    } else if (textContent.length > 2 && thirdChar === ' ') {
      if (firstChar === '#' && secondChar === '#') {
        node.spliceText(0, 2, '', true);
        const heading = createHeadingNode('h2');
        const children = block.getChildren();
        children.forEach((child) => heading.append(child));
        block.replace(heading);
      } else if (firstChar === '1' && secondChar === '.') {
        node.spliceText(0, 2, '', true);
        const list = createListNode('ol');
        const listItem = createListItemNode();
        const children = block.getChildren();
        children.forEach((child) => listItem.append(child));
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
