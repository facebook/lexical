import React from 'react';

const SYMBOLS = {
  hasNextSibling: '├',
  isLastChild: '└',
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
};

function visitTree(tree, currentNode, visitor, indent = []) {
  const childNodes = currentNode?.children ?? [];
  const childNodesLength = childNodes.length;

  childNodes.forEach((nodeKey, i) => {
    visitor(
      tree[nodeKey],
      indent.concat(
        i === childNodesLength - 1
          ? SYMBOLS.isLastChild
          : SYMBOLS.hasNextSibling,
      ),
    );

    visitTree(
      tree,
      tree[nodeKey],
      visitor,
      indent.concat(
        i === childNodesLength - 1
          ? SYMBOLS.ancestorIsLastChild
          : SYMBOLS.ancestorHasNextSibling,
      ),
    );
  });
}

export default function TreeView({nodeMap, selection}) {
  if (nodeMap?.root == null || selection == null) {
    return null;
  }
  const {anchorKey} = selection;

  let res = ' root\n';

  visitTree(nodeMap, nodeMap.root, (node, indent) => {
    const isSelected = anchorKey === node.key;
    res += `${isSelected ? '>' : ' '} ${indent.join(' ')} (${node.key.slice(
      1,
    )}) ${node.type} ${printNode(node)}\n`;
  });

  return <pre>{res}</pre>;
}

function printNode(node) {
  return node.hasOwnProperty('text')
    ? node.text.length === 0
      ? '(empty)'
      : `"${node.text}"`
    : '';
}
