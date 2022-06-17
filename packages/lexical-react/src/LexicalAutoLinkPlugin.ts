/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalEditor, LexicalNode} from 'lexical';

import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  TextNode,
} from 'lexical';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;

type LinkMatcherResult = {
  index: number;
  length: number;
  text: string;
  url: string;
};

export type LinkMatcher = (text: string) => LinkMatcherResult | null;

function findFirstMatch(
  text: string,
  matchers: Array<LinkMatcher>,
): LinkMatcherResult | null {
  for (let i = 0; i < matchers.length; i++) {
    const match = matchers[i](text);

    if (match) {
      return match;
    }
  }

  return null;
}

function isPreviousNodeValid(node: LexicalNode): boolean {
  let previousNode = node.getPreviousSibling();

  if ($isElementNode(previousNode)) {
    previousNode = previousNode.getLastDescendant();
  }

  return (
    previousNode === null ||
    $isLineBreakNode(previousNode) ||
    ($isTextNode(previousNode) && previousNode.getTextContent().endsWith(' '))
  );
}

function isNextNodeValid(node: LexicalNode): boolean {
  let nextNode = node.getNextSibling();

  if ($isElementNode(nextNode)) {
    nextNode = nextNode.getFirstDescendant();
  }

  return (
    nextNode === null ||
    $isLineBreakNode(nextNode) ||
    ($isTextNode(nextNode) && nextNode.getTextContent().startsWith(' '))
  );
}

function handleLinkCreation(
  node: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  const nodeText = node.getTextContent();
  const nodeTextLength = nodeText.length;
  let text = nodeText;
  let textOffset = 0;
  let lastNode = node;
  let match;

  while ((match = findFirstMatch(text, matchers)) && match !== null) {
    const matchOffset = match.index;
    const offset = textOffset + matchOffset;
    const matchLength = match.length;

    // Previous node is valid if any of:
    // 1. Space before same node
    // 2. Space in previous simple text node
    // 3. Previous node is LineBreakNode
    let contentBeforeMatchIsValid;

    if (offset > 0) {
      contentBeforeMatchIsValid = nodeText[offset - 1] === ' ';
    } else {
      contentBeforeMatchIsValid = isPreviousNodeValid(node);
    }

    // Next node is valid if any of:
    // 1. Space after same node
    // 2. Space in next simple text node
    // 3. Next node is LineBreakNode
    let contentAfterMatchIsValid;

    if (offset + matchLength < nodeTextLength) {
      contentAfterMatchIsValid = nodeText[offset + matchLength] === ' ';
    } else {
      contentAfterMatchIsValid = isNextNodeValid(node);
    }

    if (contentBeforeMatchIsValid && contentAfterMatchIsValid) {
      let middleNode;

      if (matchOffset === 0) {
        [middleNode, lastNode] = lastNode.splitText(matchLength);
      } else {
        [, middleNode, lastNode] = lastNode.splitText(
          matchOffset,
          matchOffset + matchLength,
        );
      }

      const linkNode = $createAutoLinkNode(match.url);
      linkNode.append($createTextNode(match.text));
      middleNode.replace(linkNode);
      onChange(match.url, null);
    }

    const iterationOffset = matchOffset + matchLength;
    text = text.substring(iterationOffset);
    textOffset += iterationOffset;
  }
}

function handleLinkEdit(
  linkNode: AutoLinkNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  // Check children are simple text
  const children = linkNode.getChildren();
  const childrenLength = children.length;

  for (let i = 0; i < childrenLength; i++) {
    const child = children[i];

    if (!$isTextNode(child) || !child.isSimpleText()) {
      replaceWithChildren(linkNode);
      onChange(null, linkNode.getURL());
      return;
    }
  }

  // Check text content fully matches
  const text = linkNode.getTextContent();
  const match = findFirstMatch(text, matchers);

  if (match === null || match.text !== text) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }

  // Check neighbors
  if (!isPreviousNodeValid(linkNode) || !isNextNodeValid(linkNode)) {
    replaceWithChildren(linkNode);
    onChange(null, linkNode.getURL());
    return;
  }

  const url = linkNode.getURL();

  if (match !== null && url !== match.url) {
    linkNode.setURL(match.url);
    onChange(match.url, url);
  }
}

// Bad neighbours are edits in neighbor nodes that make AutoLinks incompatible.
// Given the creation preconditions, these can only be simple text nodes.
function handleBadNeighbors(textNode: TextNode, onChange: ChangeHandler): void {
  const previousSibling = textNode.getPreviousSibling();
  const nextSibling = textNode.getNextSibling();
  const text = textNode.getTextContent();

  if ($isAutoLinkNode(previousSibling) && !text.startsWith(' ')) {
    replaceWithChildren(previousSibling);
    onChange(null, previousSibling.getURL());
  }

  if ($isAutoLinkNode(nextSibling) && !text.endsWith(' ')) {
    replaceWithChildren(nextSibling);
    onChange(null, nextSibling.getURL());
  }
}

function replaceWithChildren(node: ElementNode): Array<LexicalNode> {
  const children = node.getChildren();
  const childrenLength = children.length;

  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }

  node.remove();
  return children.map((child) => child.getLatest());
}

function useAutoLink(
  editor: LexicalEditor,
  matchers: Array<LinkMatcher>,
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      invariant(
        false,
        'LexicalAutoLinkPlugin: AutoLinkNode, TableCellNode or TableRowNode not registered on editor',
      );
    }

    const onChangeWrapped = (url: string | null, prevUrl: string | null) => {
      if (onChange) {
        onChange(url, prevUrl);
      }
    };

    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
        const parent = textNode.getParentOrThrow();

        if ($isAutoLinkNode(parent)) {
          handleLinkEdit(parent, matchers, onChangeWrapped);
        } else if (!$isLinkNode(parent)) {
          if (textNode.isSimpleText()) {
            handleLinkCreation(textNode, matchers, onChangeWrapped);
          }

          handleBadNeighbors(textNode, onChangeWrapped);
        }
      }),
      editor.registerNodeTransform(AutoLinkNode, (linkNode: AutoLinkNode) => {
        handleLinkEdit(linkNode, matchers, onChangeWrapped);
      }),
    );
  }, [editor, matchers, onChange]);
}

export function AutoLinkPlugin({
  matchers,
  onChange,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange);

  return null;
}
