// @flow strict-local

import type {OutlineEditor, TextNode, ViewType} from 'outline';

import {useEffect} from 'react';
import {createHeader, HeaderNode} from 'outline';

function textNodeTransform(node: TextNode, view: ViewType): void {
  const block = node.getParentBlock();

  if (
    block !== null &&
    node.getPreviousSibling() === null &&
    !(block instanceof HeaderNode)
  ) {
    const textContent = node.getTextContent();
    if (textContent[0] === '#' && textContent[1] === ' ') {
      node.spliceText(0, 2, '', true);
      const header = createHeader('h1');
      const children = block.getChildren();
      children.forEach((child) => header.append(child));
      block.replace(header);
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
