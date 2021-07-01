/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {BlockNode, ViewModel, View, OutlineEditor} from 'outline';

import {isBlockNode, isTextNode} from 'outline';

import * as React from 'react';
import {useState, useEffect} from 'react';

const NON_SINGLE_WIDTH_CHARS_REPLACEMENT: $ReadOnly<{
  [string]: string,
}> = Object.freeze({
  '\n': '\\n',
  '\t': '\\t',
});
const NON_SINGLE_WIDTH_CHARS_REGEX = new RegExp(
  Object.keys(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).join('|'),
  'g',
);
const SYMBOLS = Object.freeze({
  hasNextSibling: '├',
  isLastChild: '└',
  ancestorHasNextSibling: '|',
  ancestorIsLastChild: ' ',
  selectedChar: '^',
  selectedLine: '>',
});

export default function TreeView({
  className = '',
  editor,
}: {
  className?: string,
  editor: OutlineEditor,
}): React$Node {
  const [content, setContent] = useState<string>('');
  useEffect(() => {
    setContent(generateContent(editor.getViewModel()));
    return editor.addListener('update', () => {
      setContent(generateContent(editor.getViewModel()));
    });
  }, [editor]);

  const styles =
    className != null
      ? {
          className,
        }
      : {
          styles: {
            borderRadius: '2px',
            background: '#222',
            color: '#fff',
            padding: '10px',
            fontSize: '12px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            margin: '20px auto 20px auto',
          },
        };

  return <pre {...styles}>{content}</pre>;
}

function generateContent(viewModel: ViewModel): string {
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
      const nodeKeyDisplay = `(${nodeKey.slice(1)})`;
      const typeDisplay = node.getType() || '';
      const isSelected = selectedNodes !== null && selectedNodes.has(nodeKey);

      res += `${isSelected ? SYMBOLS.selectedLine : ' '} ${indent.join(
        ' ',
      )} ${nodeKeyDisplay} ${typeDisplay} ${printNode(node)}\n`;

      res += printSelectedCharsLine({
        isSelected,
        indent,
        node,
        nodeKeyDisplay,
        selection,
        typeDisplay,
      });
    });
  });

  return res;
}

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

    if (isBlockNode(childNode)) {
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

function normalize(text) {
  return Object.entries(NON_SINGLE_WIDTH_CHARS_REPLACEMENT).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(key, 'g'), String(value)),
    text,
  );
}

function printNode(node) {
  if (isTextNode(node)) {
    const text = node.getTextContent(true);
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
  (node) => node.isSegmented() && 'Segmented',
  (node) => node.isStrikethrough() && 'Strikethrough',
  (node) => node.isUnderline() && 'Underline',
  (node) => node.isOverflowed() && 'Overflowed',
  (node) => node.isInert() && 'Inert',
  (node) => node.isDirectionless() && 'Directionless',
  (node) => node.isUnmergeable() && 'Unmergeable',
];

function printTextNodeFlags(node) {
  return LABEL_PREDICATES.map((predicate) => predicate(node))
    .filter(Boolean)
    .join(', ');
}

function printSelectedCharsLine({
  indent,
  isSelected,
  node,
  nodeKeyDisplay,
  selection,
  typeDisplay,
}) {
  // No selection or node is not selected.
  if (
    !isTextNode(node) ||
    selection === null ||
    !isSelected ||
    isBlockNode(node)
  ) {
    return '';
  }

  // No selected characters.
  if (
    node.getTextContent() === '' ||
    (selection.getAnchorNode() === selection.getFocusNode() &&
      selection.anchorOffset === selection.focusOffset)
  ) {
    return '';
  }

  const [start, end] = getSelectionStartEnd(node, selection);

  if (start === end) {
    return '';
  }

  const selectionLastIndent =
    indent[indent.length - 1] === SYMBOLS.hasNextSibling
      ? SYMBOLS.ancestorHasNextSibling
      : SYMBOLS.ancestorIsLastChild;

  const indentionChars = [
    ...indent.slice(0, indent.length - 1),
    selectionLastIndent,
  ];
  const unselectedChars = Array(start).fill(' ');
  const selectedChars = Array(end - start).fill(SYMBOLS.selectedChar);
  const paddingLength = typeDisplay.length + 3; // 2 for the spaces around + 1 for the double quote.
  const nodePrintSpaces = Array(nodeKeyDisplay.length + paddingLength).fill(
    ' ',
  );

  return (
    [
      SYMBOLS.selectedLine,
      indentionChars.join(' '),
      [...nodePrintSpaces, ...unselectedChars, ...selectedChars].join(''),
    ].join(' ') + '\n'
  );
}

function getSelectionStartEnd(node, selection): [number, number] {
  const anchorNode = selection.getAnchorNode();
  const focusNode = selection.getFocusNode();
  const textContent = node.getTextContent(true);
  const textLength = textContent.length;

  let start = -1;
  let end = -1;
  // Only one node is being selected.
  if (
    anchorNode === focusNode &&
    node === anchorNode &&
    selection.anchorOffset !== selection.focusOffset
  ) {
    [start, end] =
      selection.anchorOffset < selection.focusOffset
        ? [selection.anchorOffset, selection.focusOffset]
        : [selection.focusOffset, selection.anchorOffset];
  } else if (node === anchorNode) {
    [start, end] = anchorNode.isBefore(focusNode)
      ? [selection.anchorOffset, textLength]
      : [0, selection.anchorOffset];
  } else if (node === focusNode) {
    [start, end] = focusNode.isBefore(anchorNode)
      ? [selection.focusOffset, textLength]
      : [0, selection.focusOffset];
  } else {
    // Node is within selection but not the anchor nor focus.
    [start, end] = [0, textLength];
  }

  // Account for non-single width characters.
  const numNonSingleWidthCharBeforeSelection = (
    textContent.slice(0, start).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;
  const numNonSingleWidthCharInSelection = (
    textContent.slice(start, end).match(NON_SINGLE_WIDTH_CHARS_REGEX) || []
  ).length;

  return [
    start + numNonSingleWidthCharBeforeSelection,
    end +
      numNonSingleWidthCharBeforeSelection +
      numNonSingleWidthCharInSelection,
  ];
}
