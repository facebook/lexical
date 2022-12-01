/** @module @lexical/text */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Klass, LexicalEditor, LexicalNode, RootNode} from 'lexical';

import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  TextNode,
} from 'lexical';

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
  isEditable: boolean,
): boolean {
  if (!isEditable || !$isRootTextContentEmpty(isComposing, false)) {
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
  isEditable: boolean,
): () => boolean {
  return () => $canShowPlaceholder(isEditorComposing, isEditable);
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

  const getMode = (node: TextNode): number => {
    return node.getLatest().__mode;
  };

  const replaceWithSimpleText = (node: TextNode): void => {
    const textNode = $createTextNode(node.getTextContent());
    textNode.setFormat(node.getFormat());
    node.replace(textNode);
  };

  const textNodeTransform = (node: TextNode) => {
    if (!node.isSimpleText()) {
      return;
    }

    const text = node.getTextContent();
    const match = getMatch(text);

    if ($isTextNode(node)) {
      if (match) {
        let nodeToReplace;

        if (match.start > 0) {
          [, nodeToReplace] = node.splitText(match.start, match.end);
        } else {
          [nodeToReplace] = node.splitText(match.end);
        }

        if (nodeToReplace) {
          nodeToReplace.replace(createNode(nodeToReplace));
        }
      }
    }

    const previousSibling = node.getPreviousSibling();

    // The below handles the logic for when tou need to merge a text entity with a previous sibling which matches
    if (isTargetNode(previousSibling)) {
      const previousText = previousSibling.getTextContent();
      const combinedText = previousText + text;
      const previousSiblingCurrentNodeMatch = getMatch(combinedText);

      if (!previousSiblingCurrentNodeMatch) {
        previousSibling.replace($createTextNode(previousText));
      } else if (
        previousSiblingCurrentNodeMatch &&
        previousSiblingCurrentNodeMatch.end > previousText.length
      ) {
        previousSibling.select();

        previousSibling.setTextContent(
          combinedText.slice(0, previousSiblingCurrentNodeMatch.end),
        );

        const replacementText = combinedText.slice(
          previousSiblingCurrentNodeMatch.end,
        );

        node.setTextContent(replacementText);
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

  const removeReverseNodeTransform = editor.registerNodeTransform<T>(
    targetNode,
    reverseNodeTransform,
  );

  return [
    editor.registerNodeTransform(TextNode, textNodeTransform),
    // removeReverseNodeTransform,
  ];
}
