/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LinkAttributes} from '@lexical/link';
import type {ElementNode, LexicalEditor, LexicalNode} from 'lexical';

import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {$isLineBreakNode, $isTextNode, TextNode} from 'lexical';
import {useEffect} from 'react';
import invariant from 'shared/invariant';

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;

type LinkMatcherResult = {
  attributes?: LinkAttributes;
  index: number;
  length: number;
  text: string;
  url: string;
};

export type LinkMatcher = (text: string) => LinkMatcherResult | null;

export function createLinkMatcherWithRegExp(
  regExp: RegExp,
  urlTransformer: (text: string) => string = (text) => text,
): LinkMatcher {
  return (text: string) => {
    const match = regExp.exec(text);
    if (match === null) return null;
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: urlTransformer(match[0]),
    };
  };
}

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

function getPrefixTextSiblings(node: LexicalNode) {
  const prevSiblings = node.getPreviousSiblings();
  const result: TextNode[] = [];

  for (let i = prevSiblings.length - 1; i >= 0; i--) {
    const sibling = prevSiblings[i];
    if ($isTextNode(sibling) && sibling.isSimpleText()) {
      result.push(sibling);
    } else {
      break;
    }
  }
  return {
    nodes: result.reverse(),
    textContent: result.map((n) => n.getTextContent()).join(''),
  };
}

function getSuffixTextSiblings(node: LexicalNode) {
  const nextSiblings = node.getNextSiblings();
  const result: TextNode[] = [];

  for (let i = 0; i < nextSiblings.length; i++) {
    const sibling = nextSiblings[i];
    if ($isTextNode(sibling) && sibling.isSimpleText()) {
      result.push(sibling);
    } else {
      break;
    }
  }
  return {
    nodes: result,
    textContent: result.map((n) => n.getTextContent()).join(''),
  };
}

function splitNodes(
  nodes: TextNode[],
  index: number,
  length: number,
): {
  prevRemainingNodes: TextNode[];
  splittedNodes: TextNode[];
  nextRemainingNodes: TextNode[];
} {
  const endIndex = index + length;
  const nodesLength = nodes.length;

  const prevRemainingNodes: TextNode[] = [];
  const splittedNodes: TextNode[] = [];
  const nextRemainingNodes: TextNode[] = [];
  let totalTextLength = 0;
  for (let i = 0; i < nodesLength; i++) {
    const child = nodes[i];
    const childText = child.getTextContent();
    const childTextLength = childText.length;
    const prevTotalTextLength = totalTextLength;
    totalTextLength = prevTotalTextLength + childTextLength;

    if (totalTextLength <= index) {
      prevRemainingNodes.push(child);
    } else if (prevTotalTextLength >= endIndex) {
      nextRemainingNodes.push(child);
    } else if (prevTotalTextLength >= index && totalTextLength <= endIndex) {
      splittedNodes.push(child);
    } else {
      if (prevTotalTextLength < index) {
        const [prevRemainingNode, splittedNode] = child.splitText(
          index - prevTotalTextLength,
        );
        prevRemainingNodes.push(prevRemainingNode);
        if (splittedNode) {
          splittedNodes.push(splittedNode);
        }
      } else if (totalTextLength > endIndex) {
        const [splittedNode, nextRemainingNode] = child.splitText(
          endIndex - prevTotalTextLength,
        );
        splittedNodes.push(splittedNode);
        if (nextRemainingNode) {
          nextRemainingNodes.push(nextRemainingNode);
        }
      }
    }
  }
  return {nextRemainingNodes, prevRemainingNodes, splittedNodes};
}

function replaceWithChildren(node: ElementNode): Array<LexicalNode> {
  const children = node.getChildren();
  const childrenLength = children.length;

  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }

  node.remove();
  return children.map((child) => child.getWritable());
}

function handleLinkCreation(
  node: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  const nodeText = node.getTextContent();
  const {nodes: prefixNodes, textContent: prefixText} =
    getPrefixTextSiblings(node);
  const {nodes: suffixNodes, textContent: suffixText} =
    getSuffixTextSiblings(node);

  const targetNodes = [...prefixNodes, node, ...suffixNodes];
  let text = prefixText + nodeText + suffixText;
  let remainingTextNodes = targetNodes;
  let match: LinkMatcherResult | null;

  while ((match = findFirstMatch(text, matchers)) && match !== null) {
    const matchStart = match.index;
    const matchLength = match.length;

    const {prevRemainingNodes, splittedNodes, nextRemainingNodes} = splitNodes(
      remainingTextNodes,
      matchStart,
      matchLength,
    );

    const linkNode = $createAutoLinkNode(match.url, match.attributes);
    splittedNodes.forEach((textNode, i) => {
      if (i === 0) {
        textNode.insertAfter(linkNode);
      }
      linkNode.append(textNode);
    });
    prevRemainingNodes.forEach((textNode) => {
      linkNode.insertBefore(textNode);
    });
    nextRemainingNodes
      .slice()
      .reverse()
      .forEach((textNode) => {
        linkNode.insertAfter(textNode);
      });

    onChange(match.url, null);

    remainingTextNodes = nextRemainingNodes;
    text = text.substring(matchStart + matchLength);
  }
}

function handleUpdateUrl(
  linkNode: AutoLinkNode,
  match: LinkMatcherResult | null,
  onChange: ChangeHandler,
) {
  const url = linkNode.getURL();

  if (match === null) {
    onChange(null, url);
    return;
  }
  if (url !== match.url) {
    linkNode.setURL(match.url);
    onChange(match.url, url);
  }

  if (match.attributes) {
    const rel = linkNode.getRel();
    if (rel !== match.attributes.rel) {
      linkNode.setRel(match.attributes.rel || null);
      onChange(match.attributes.rel || null, rel);
    }

    const target = linkNode.getTarget();
    if (target !== match.attributes.target) {
      linkNode.setTarget(match.attributes.target || null);
      onChange(match.attributes.target || null, target);
    }
  }
}

function handleLinkEdit(
  textNode: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  const linkNode = textNode.getParent();
  if (!$isAutoLinkNode(linkNode)) {
    return;
  }

  // Check children are simple text
  const children = linkNode.getChildren();
  const childrenTextNodes: TextNode[] = [];
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const child = children[i];
    if (i === childrenLength - 1 && $isLineBreakNode(child)) {
      linkNode.insertAfter(child);
      return;
    }
    if (!$isTextNode(child) || !child.isSimpleText()) {
      replaceWithChildren(linkNode);
      handleUpdateUrl(linkNode, null, onChange);
      return;
    }
    childrenTextNodes.push(child);
  }

  const {nodes: prefixNodes, textContent: prefixText} =
    getPrefixTextSiblings(linkNode);
  const {nodes: suffixNodes, textContent: suffixText} =
    getSuffixTextSiblings(linkNode);

  const text = prefixText + linkNode.getTextContent() + suffixText;
  const match = findFirstMatch(text, matchers);
  if (!match) {
    replaceWithChildren(linkNode);
    handleUpdateUrl(linkNode, null, onChange);
    return;
  }

  const matchStart = match.index;
  const matchLength = match.length;

  const {prevRemainingNodes, splittedNodes, nextRemainingNodes} = splitNodes(
    [...prefixNodes, ...childrenTextNodes, ...suffixNodes],
    matchStart,
    matchLength,
  );
  prevRemainingNodes.forEach((node) => {
    if (linkNode.isParentOf(node)) {
      linkNode.insertBefore(node);
    }
  });

  nextRemainingNodes.reverse().forEach((node) => {
    if (linkNode.isParentOf(node)) {
      linkNode.insertAfter(node);
    }
  });

  if (linkNode.getTextContent() !== match.text) {
    linkNode.splice(0, linkNode.getChildrenSize(), splittedNodes);
  }

  handleUpdateUrl(linkNode, match, onChange);
}

function findLast<T, U extends T>(
  array: T[],
  predicate: (value: T) => value is U,
): U | null {
  for (let i = array.length - 1; i >= 0; i--) {
    const item = array[i];
    if (predicate(item)) {
      return item;
    }
  }
  return null;
}

function handleNeighbors(
  textNode: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  const prevSiblings = textNode.getPreviousSiblings();
  const nextSiblings = textNode.getNextSiblings();
  const prevLinkNode = findLast(prevSiblings, $isAutoLinkNode);
  const nextLinkNode = nextSiblings.find($isAutoLinkNode);

  if (!prevLinkNode && !nextLinkNode) {
    return;
  }

  if (prevLinkNode) {
    const children = prevLinkNode.getChildren();
    const childrenTextNodes: TextNode[] = [];
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      if (!$isTextNode(child) || !child.isSimpleText()) {
        replaceWithChildren(prevLinkNode);
        handleUpdateUrl(prevLinkNode, null, onChange);
        return;
      }
      childrenTextNodes.push(child);
    }
    const {nodes: suffixNodes, textContent: suffixText} =
      getSuffixTextSiblings(prevLinkNode);
    const text = prevLinkNode.getTextContent() + suffixText;
    const match = findFirstMatch(text, matchers);
    if (match !== null) {
      const matchStart = match.index;
      const matchLength = match.length;

      if (match.text === text) {
        suffixNodes.forEach((node) => {
          prevLinkNode.append(node);
        });
      } else {
        const {prevRemainingNodes, splittedNodes, nextRemainingNodes} =
          splitNodes(
            childrenTextNodes.concat(suffixNodes),
            matchStart,
            matchLength,
          );

        prevRemainingNodes.forEach((node) => {
          if (prevLinkNode.isParentOf(node)) {
            prevLinkNode.insertBefore(node);
          }
        });

        nextRemainingNodes.reverse().forEach((node) => {
          if (prevLinkNode.isParentOf(node)) {
            prevLinkNode.insertAfter(node);
          }
        });

        if (prevLinkNode.getTextContent() !== match.text) {
          prevLinkNode.splice(0, prevLinkNode.getChildrenSize(), splittedNodes);
        }
      }
      handleUpdateUrl(prevLinkNode, match, onChange);
    }
  }

  if (nextLinkNode) {
    const children = nextLinkNode.getChildren();
    const childrenTextNodes: TextNode[] = [];
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; i++) {
      const child = children[i];
      if (!$isTextNode(child) || !child.isSimpleText()) {
        replaceWithChildren(nextLinkNode);
        handleUpdateUrl(nextLinkNode, null, onChange);
        return;
      }
      childrenTextNodes.push(child);
    }
    const {nodes: prefixNodes, textContent: prefixText} =
      getPrefixTextSiblings(nextLinkNode);
    const text = prefixText + nextLinkNode.getTextContent();
    const match = findFirstMatch(text, matchers);
    if (match !== null) {
      const matchStart = match.index;
      const matchLength = match.length;

      if (match.text === text) {
        prefixNodes.reverse().forEach((node) => {
          nextLinkNode.splice(0, 0, [node]);
        });
      } else {
        const {prevRemainingNodes, splittedNodes, nextRemainingNodes} =
          splitNodes(
            prefixNodes.concat(childrenTextNodes),
            matchStart,
            matchLength,
          );

        prevRemainingNodes.forEach((node) => {
          if (nextLinkNode.isParentOf(node)) {
            nextLinkNode.insertBefore(node);
          }
        });

        nextRemainingNodes.reverse().forEach((node) => {
          if (nextLinkNode.isParentOf(node)) {
            nextLinkNode.insertAfter(node);
          }
        });

        if (nextLinkNode.getTextContent() !== match.text) {
          nextLinkNode.splice(0, nextLinkNode.getChildrenSize(), splittedNodes);
        }
      }
      handleUpdateUrl(nextLinkNode, match, onChange);
    }
  }
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
        'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor',
      );
    }

    const onChangeWrapped = (url: string | null, prevUrl: string | null) => {
      if (onChange) {
        onChange(url, prevUrl);
      }
    };

    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode, ...a) => {
        if (!textNode.isSimpleText()) {
          return;
        }
        const parent = textNode.getParentOrThrow();
        const parentIsAutoLink = $isAutoLinkNode(parent);
        if (!parentIsAutoLink && $isLinkNode(parent)) {
          return;
        }

        if (parentIsAutoLink) {
          handleLinkEdit(textNode, matchers, onChangeWrapped);
        } else {
          handleLinkCreation(textNode, matchers, onChangeWrapped);
        }
        handleNeighbors(textNode, matchers, onChangeWrapped);
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
