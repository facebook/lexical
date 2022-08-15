/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
  RootNode,
} from 'lexical';

import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  TextNode,
} from 'lexical';
import invariant from 'shared/invariant';

export type TextNodeWithOffset = {
  node: TextNode;
  offset: number;
};

export function $findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {node: TextNode; offset: number} {
  let node = root.getFirstChild();
  let currentCharacters = 0;

  mainLoop: while (node !== null) {
    if ($isElementNode(node)) {
      const child = node.getFirstChild();

      if (child !== null) {
        node = child;
        continue;
      }
    } else if ($isTextNode(node)) {
      const characters = node.getTextContentSize();

      if (currentCharacters + characters > targetCharacters) {
        return {node, offset: targetCharacters - currentCharacters};
      }
      currentCharacters += characters;
    }
    const sibling = node.getNextSibling();

    if (sibling !== null) {
      node = sibling;
      continue;
    }
    let parent = node.getParent();
    while (parent !== null) {
      const parentSibling = parent.getNextSibling();

      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.getParent();
    }
    break;
  }

  return null;
}

// Return text content for child text nodes.  Each non-text node is separated by input string.
// Caution, this function creates a string and should not be used within a tight loop.
// Use $getNodeWithOffsetsFromJoinedTextNodesFromElementNode below to convert
// indexes in the return string back into their corresponding node and offsets.
export function $joinTextNodesInElementNode(
  elementNode: ElementNode,
  separator: string,
  stopAt: TextNodeWithOffset,
): string {
  let textContent = '';
  const children = elementNode.getChildren();
  const length = children.length;

  for (let i = 0; i < length; ++i) {
    const child = children[i];

    if ($isTextNode(child)) {
      const childTextContent = child.getTextContent();

      if (child.is(stopAt.node)) {
        if (stopAt.offset > childTextContent.length) {
          invariant(
            false,
            'Node %s and selection point do not match.',
            child.__key,
          );
        }
        textContent += child.getTextContent().substr(0, stopAt.offset);
        break;
      } else {
        textContent += childTextContent;
      }
    } else {
      textContent += separator;
    }
  }

  return textContent;
}

// This function converts the offsetInJoinedText to
// a node and offset result or null if not found.
// This function is to be used in conjunction with joinTextNodesInElementNode above.
// The joinedTextContent should be return value from joinTextNodesInElementNode.
//
// The offsetInJoinedText is relative to the entire string which
// itself is relevant to the parent ElementNode.
//
// Example:
// Given a Paragraph with 2 TextNodes. The first is Hello, the second is World.
// The joinedTextContent would be "HelloWorld"
// The offsetInJoinedText might be for the letter "e" = 1 or "r" = 7.
// The return values would be {TextNode1, 1} or {TextNode2,2}, respectively.

export function $findNodeWithOffsetFromJoinedText(
  offsetInJoinedText: number,
  joinedTextLength: number,
  separatorLength: number,
  elementNode: ElementNode,
): TextNodeWithOffset | null {
  const children = elementNode.getChildren();
  const childrenLength = children.length;
  let runningLength = 0;
  let isPriorNodeTextNode = false;

  for (let i = 0; i < childrenLength; ++i) {
    // We must examine the offsetInJoinedText that is located
    // at the length of the string.
    // For example, given "hello", the length is 5, yet
    // the caller still wants the node + offset at the
    // right edge of the "o".

    if (runningLength > joinedTextLength) {
      break;
    }

    const child = children[i];
    const isChildNodeTestNode = $isTextNode(child);
    const childContentLength = isChildNodeTestNode
      ? child.getTextContent().length
      : separatorLength;

    const newRunningLength = runningLength + childContentLength;

    const isJoinedOffsetWithinNode =
      (isPriorNodeTextNode === false && runningLength === offsetInJoinedText) ||
      (runningLength === 0 && runningLength === offsetInJoinedText) ||
      (runningLength < offsetInJoinedText &&
        offsetInJoinedText <= newRunningLength);

    if (isJoinedOffsetWithinNode && $isTextNode(child)) {
      // Check isTextNode again for flow.

      return {
        node: child,
        offset: offsetInJoinedText - runningLength,
      };
    }
    runningLength = newRunningLength;
    isPriorNodeTextNode = isChildNodeTestNode;
  }

  return null;
}

export function $isRootTextContentEmpty(
  isEditorComposing: boolean,
  trim = true,
): boolean {
  if (isEditorComposing) {
    return false;
  }

  let text = $rootTextContent();

  if (trim) {
    text = text.trim();
  }

  return text === '';
}

export function $isRootTextContentEmptyCurry(
  isEditorComposing: boolean,
  trim?: boolean,
): () => boolean {
  return () => $isRootTextContentEmpty(isEditorComposing, trim);
}

export function $rootTextContent(): string {
  const root = $getRoot();

  return root.getTextContent();
}

export function $canShowPlaceholder(
  isComposing: boolean,
  // TODO 0.4 make mandatory
  isReadOnly = false,
): boolean {
  if (isReadOnly || !$isRootTextContentEmpty(isComposing, false)) {
    return false;
  }

  const root = $getRoot();
  const children = root.getChildren();
  const childrenLength = children.length;

  if (childrenLength > 1) {
    return false;
  }

  for (let i = 0; i < childrenLength; i++) {
    const topBlock = children[i];

    if ($isElementNode(topBlock)) {
      if (topBlock.__type !== 'paragraph') {
        return false;
      }

      if (topBlock.__indent !== 0) {
        return false;
      }

      const topBlockChildren = topBlock.getChildren();
      const topBlockChildrenLength = topBlockChildren.length;

      for (let s = 0; s < topBlockChildrenLength; s++) {
        const child = topBlockChildren[i];

        if (!$isTextNode(child)) {
          return false;
        }
      }
    }
  }

  return true;
}

export function $canShowPlaceholderCurry(
  isEditorComposing: boolean,
  // TODO 0.4 make mandatory
  isReadOnly = false,
): () => boolean {
  return () => $canShowPlaceholder(isEditorComposing, isReadOnly);
}

export type EntityMatch = {end: number; start: number};

export function registerLexicalTextEntity<T extends TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Klass<T>,
  createNode: (textNode: TextNode) => T,
): Array<() => void> {
  const isTargetNode = (node: LexicalNode | null | undefined): node is T => {
    return node instanceof targetNode;
  };

  const replaceWithSimpleText = (node: TextNode): void => {
    const textNode = $createTextNode(node.getTextContent());
    textNode.setFormat(node.getFormat());
    node.replace(textNode);
  };

  const getMode = (node: TextNode): number => {
    return node.getLatest().__mode;
  };

  const textNodeTransform = (node: TextNode) => {
    if (!node.isSimpleText()) {
      return;
    }

    const prevSibling = node.getPreviousSibling();
    let text = node.getTextContent();
    let currentNode = node;
    let match;

    if ($isTextNode(prevSibling)) {
      const previousText = prevSibling.getTextContent();
      const combinedText = previousText + text;
      const prevMatch = getMatch(combinedText);

      if (isTargetNode(prevSibling)) {
        if (prevMatch === null || getMode(prevSibling) !== 0) {
          replaceWithSimpleText(prevSibling);

          return;
        } else {
          const diff = prevMatch.end - previousText.length;

          if (diff > 0) {
            const concatText = text.slice(0, diff);
            const newTextContent = previousText + concatText;
            prevSibling.select();
            prevSibling.setTextContent(newTextContent);

            if (diff === text.length) {
              node.remove();
            } else {
              const remainingText = text.slice(diff);
              node.setTextContent(remainingText);
            }

            return;
          }
        }
      } else if (prevMatch === null || prevMatch.start < previousText.length) {
        return;
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      match = getMatch(text);
      let nextText = match === null ? '' : text.slice(match.end);
      text = nextText;

      if (nextText === '') {
        const nextSibling = currentNode.getNextSibling();

        if ($isTextNode(nextSibling)) {
          nextText =
            currentNode.getTextContent() + nextSibling.getTextContent();
          const nextMatch = getMatch(nextText);

          if (nextMatch === null) {
            if (isTargetNode(nextSibling)) {
              replaceWithSimpleText(nextSibling);
            } else {
              nextSibling.markDirty();
            }

            return;
          } else if (nextMatch.start !== 0) {
            return;
          }
        }
      } else {
        const nextMatch = getMatch(nextText);

        if (nextMatch !== null && nextMatch.start === 0) {
          return;
        }
      }

      if (match === null) {
        return;
      }

      if (
        match.start === 0 &&
        $isTextNode(prevSibling) &&
        prevSibling.isTextEntity()
      ) {
        continue;
      }

      let nodeToReplace;

      if (match.start === 0) {
        [nodeToReplace, currentNode] = currentNode.splitText(match.end);
      } else {
        [, nodeToReplace, currentNode] = currentNode.splitText(
          match.start,
          match.end,
        );
      }

      const replacementNode = createNode(nodeToReplace);
      nodeToReplace.replace(replacementNode);

      if (currentNode == null) {
        return;
      }
    }
  };

  const reverseNodeTransform = (node: T) => {
    const text = node.getTextContent();
    const match = getMatch(text);

    if (match === null || match.start !== 0) {
      replaceWithSimpleText(node);

      return;
    }

    if (text.length > match.end) {
      // This will split out the rest of the text as simple text
      node.splitText(match.end);

      return;
    }

    const prevSibling = node.getPreviousSibling();

    if ($isTextNode(prevSibling) && prevSibling.isTextEntity()) {
      replaceWithSimpleText(prevSibling);
      replaceWithSimpleText(node);
    }

    const nextSibling = node.getNextSibling();

    if ($isTextNode(nextSibling) && nextSibling.isTextEntity()) {
      replaceWithSimpleText(nextSibling);

      // This may have already been converted in the previous block
      if (isTargetNode(node)) {
        replaceWithSimpleText(node);
      }
    }
  };

  const removePlainTextTransform = editor.registerNodeTransform(
    TextNode,
    textNodeTransform,
  );
  const removeReverseNodeTransform = editor.registerNodeTransform<T>(
    targetNode,
    reverseNodeTransform,
  );

  return [removePlainTextTransform, removeReverseNodeTransform];
}
