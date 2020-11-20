// @flow strict-local

import type {OutlineEditor, TextNode, ViewType} from 'outline';

import {useEffect} from 'react';
import {createList, createListItem, ListNode, ListItemNode} from 'outline';
import {createHeader, HeaderNode} from 'outline-rich-text-plugin';

function textNodeTransform(node: TextNode, view: ViewType): void {
  const block = node.getParentBlock();

  if (
    block !== null &&
    node.getPreviousSibling() === null &&
    !(block instanceof HeaderNode) &&
    !(block instanceof ListItemNode) &&
    !(block instanceof ListNode)
  ) {
    const textContent = node.getTextContent();
    const firstChar = textContent[0];
    const secondChar = textContent[1];
    const thirdChar = textContent[2];

    if (textContent.length > 1 && secondChar === ' ') {
      if (firstChar === '#') {
        node.spliceText(0, 2, '', true);
        const header = createHeader('h1');
        const children = block.getChildren();
        children.forEach((child) => header.append(child));
        block.replace(header);
      } else if (firstChar === '-' || firstChar === '*') {
        node.spliceText(0, 2, '', true);
        const list = createList('ul');
        const listItem = createListItem();
        const children = block.getChildren();
        children.forEach((child) => listItem.append(child));
        list.append(listItem);
        block.replace(list);
      }
    } else if (textContent.length > 2 && thirdChar === ' ') {
      if (firstChar === '#' && secondChar === '#') {
        node.spliceText(0, 2, '', true);
        const header = createHeader('h2');
        const children = block.getChildren();
        children.forEach((child) => header.append(child));
        block.replace(header);
      }
    }
  }
}

export function useFormatPlugin(editor: null | OutlineEditor): void {
  useEffect(() => {
    if (editor !== null) {
      return editor.addTextTransform(textNodeTransform);
    }
  }, [editor]);
}
