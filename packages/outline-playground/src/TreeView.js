/**
 *
 * @flow strict
 */

import type {ViewModel, View} from 'outline';

import {BlockNode, TextNode} from 'outline';

import React from 'react';

// Keep in sync with OutlineNode.js and OutlineTextNode.js
const IS_IMMUTABLE = 1;
const IS_SEGMENTED = 1 << 1;
const IS_BOLD = 1 << 3;
const IS_ITALIC = 1 << 4;
const IS_STRIKETHROUGH = 1 << 5;
const IS_UNDERLINE = 1 << 6;
const IS_CODE = 1 << 7;
const IS_LINK = 1 << 8;
const IS_HASHTAG = 1 << 9;

const SYMBOLS = Object.freeze({
  hasNextSibling: '├',
  isLastChild: '└',
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
});

const FLAG_LABELS = Object.freeze({
  [IS_IMMUTABLE]: 'Immutable',
  [IS_SEGMENTED]: 'Segmented',
  [IS_BOLD]: 'Bold',
  [IS_ITALIC]: 'Italic',
  [IS_STRIKETHROUGH]: 'Strikethrough',
  [IS_UNDERLINE]: 'Underline',
  [IS_CODE]: 'Code',
  [IS_LINK]: 'Link',
  [IS_HASHTAG]: 'Hashtag',
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
    const flags = node.getFlags();
    const flagLabels = printFlags(flags);
    const flagLabelsFormatted =
      flagLabels.length !== 0 ? `(${flagLabels})` : null;
    return [title, `flags: ${flags}`, flagLabelsFormatted]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  return '';
}

function printFlags(flags) {
  return Object.entries(FLAG_LABELS)
    .map(([flag, label]) => (flags & Number(flag) ? label : null))
    .filter(Boolean)
    .join(', ');
}
