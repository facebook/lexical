/**
 *
 * @flow strict
 */

import type {ViewModel, View} from 'outline';

import {BlockNode, TextNode} from 'outline';

import React from 'react';

const SYMBOLS = {
  hasNextSibling: '├',
  isLastChild: '└',
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
};

function visitTree(view: View, currentNode: BlockNode, visitor, indent = []) {
  const childNodes = currentNode.getChildren();
  const childNodesLength = childNodes.length;

  childNodes.forEach((childNode, i) => {
    visitor(
      childNode,
      indent.concat(
        i === childNodesLength - 1
          ? SYMBOLS.isLastChild
          : SYMBOLS.hasNextSibling,
      ),
    );

    if (childNode instanceof BlockNode) {
      visitTree(
        view,
        childNode,
        visitor,
        indent.concat(
          i === childNodesLength - 1
            ? SYMBOLS.ancestorIsLastChild
            : SYMBOLS.ancestorHasNextSibling,
        ),
      );
    }
  });
}

export default function TreeView({
  viewModel,
}: {
  viewModel: ?ViewModel,
}): React$Node {
  const content = React.useMemo(() => {
    if (viewModel == null) {
      return null;
    }

    let res = ' root\n';

    viewModel.read((view: View) => {
      const selection = view.getSelection();
      let selectedNodes = null;
      if (selection !== null) {
        selectedNodes = new Set(
          selection.getNodes().map((node) => node.getKey()),
        );
      }

      visitTree(view, view.getRoot(), (node, indent) => {
        const nodeKey = node.getKey();
        const isSelected = selectedNodes !== null && selectedNodes.has(nodeKey);
        res += `${isSelected ? '>' : ' '} ${indent.join(' ')} (${nodeKey.slice(
          1,
        )}) ${node?.getType() ?? ''} ${printNode(node)}\n`;
      });
    });

    return res;
  }, [viewModel]);

  return <pre>{content}</pre>;
}

function printNode(node) {
  if (node instanceof TextNode) {
    const text = node.getTextContent();
    const title = text.length === 0 ? '(empty)' : `"${node.getTextContent()}"`;
    return `${title} flags: ${node.getFlags()}`;
  }
  return '';
}
