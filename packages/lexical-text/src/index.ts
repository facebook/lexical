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

export function $canShowPlaceholder(isComposing: boolean): boolean {
  if (!$isRootTextContentEmpty(isComposing, false)) {
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
): () => boolean {
  return () => $canShowPlaceholder(isEditorComposing);
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
