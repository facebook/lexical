/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$createTextNode, $isTextNode, TextNode} from 'lexical';
import {useEffect} from 'react';

export type EntityMatch = {end: number, start: number};

export default function useLexicalTextEntity<N: TextNode>(
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): void {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const isTargetNode = (node: ?LexicalNode): boolean %checks => {
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
        } else if (
          prevMatch === null ||
          prevMatch.start < previousText.length
        ) {
          return;
        }
      }

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

    const reverseNodeTransform = (node: N) => {
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

    const removePlainTextTransform = editor.addNodeTransform(
      TextNode,
      textNodeTransform,
    );
    const removeReverseNodeTransform = editor.addNodeTransform<N>(
      targetNode,
      reverseNodeTransform,
    );

    return () => {
      removePlainTextTransform();
      removeReverseNodeTransform();
    };
  }, [createNode, editor, getMatch, targetNode]);
}
