/**
 *
 * @flow strict
 */

import type {ViewModel, View} from 'outline';

import {BlockNode, TextNode} from 'outline';

import React from 'react';

const SYMBOLS = Object.freeze({
  hasNextSibling: '├',
  isLastChild: '└',
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
});

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

function normalize(text) {
  return text.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

function printNode(node) {
  if (node instanceof TextNode) {
    const text = node.getTextContent();
    const title = text.length === 0 ? '(empty)' : `"${normalize(text)}"`;
    const flagLabels = printTextNodeFlags(node);
    return [title, flagLabels.length !== 0 ? `flags: ${flagLabels}` : null]
      .filter(Boolean)
      .join(', ')
      .trim();
  }

  return '';
}

const LABEL_PREDICATES = [
  (node) => node.isBold() && 'Bold',
  (node) => node.isCode() && 'Code',
  (node) => node.isHashtag() && 'Hashtag',
  (node) => node.isImmutable() && 'Immutable',
  (node) => node.isItalic() && 'Italic',
  (node) => node.isLink() && 'Link',
  (node) => node.isSegmented() && 'Segmented',
  (node) => node.isStrikethrough() && 'Strikethrough',
  (node) => node.isUnderline() && 'Underline',
];

function printTextNodeFlags(node) {
  return LABEL_PREDICATES.map((predicate) => predicate(node))
    .filter(Boolean)
    .join(', ');
}
