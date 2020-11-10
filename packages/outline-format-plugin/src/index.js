import {useEffect} from 'react';
import {createHeader} from 'outline';

function textNodeTransform(node, view) {
  const block = node.getParentBlock();

  if (node.getPreviousSibling() === null && block !== null && !block.isHeader()) {
    const textContent = node.getTextContent();
    if (textContent[0] === '#' && textContent[1] === ' ') {
      node.spliceText(0, 2, '', true);
      const header = createHeader('h1');
      const children = block.getChildren();
      children.forEach(child => header.append(child));
      block.replace(header);
    }
  }
}

export function useFormatPlugin(outlineEditor) {
  useEffect(() => {
    if (outlineEditor !== null) {
      return outlineEditor.addTextTransform(textNodeTransform);
    }
  }, [outlineEditor]);
}
