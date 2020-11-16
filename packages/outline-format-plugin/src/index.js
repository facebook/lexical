// @flow strict-local

import type {OutlineEditor, TextNode, ViewType} from 'outline';

import {useEffect} from 'react';
import {
  createHeader,
  createList,
  createListItem,
  HeaderNode,
  ListNode,
  ListItemNode,
} from 'outline';

function textNodeTransform(node: TextNode, view: ViewType): void {
  const branch = node.getParentBranch();

  if (
    branch !== null &&
    node.getPreviousSibling() === null &&
    !(branch instanceof HeaderNode) &&
    !(branch instanceof ListItemNode) &&
    !(branch instanceof ListNode)
  ) {
    const textContent = node.getTextContent();
    if (textContent.length > 1 && textContent[1] === ' ') {
      const firstChar = textContent[0];
      if (firstChar === '#') {
        node.spliceText(0, 2, '', true);
        const header = createHeader('h1');
        const children = branch.getChildren();
        children.forEach((child) => header.append(child));
        branch.replace(header);
      } else if (firstChar === '-' || firstChar === '*') {
        node.spliceText(0, 2, '', true);
        const list = createList('ul');
        const listItem = createListItem();
        const children = branch.getChildren();
        children.forEach((child) => listItem.append(child));
        list.append(listItem);
        branch.replace(list);
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
