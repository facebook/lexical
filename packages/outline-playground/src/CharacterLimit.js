/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View, OutlineNode} from 'outline';

import {isBlockNode, isTextNode, TextNode, createTextNode} from 'outline';
import {
  createOverflowedTextNode,
  isOverflowedTextNode,
} from 'outline/OverflowedTextNode';
import {findTextIntersectionFromCharacters} from 'outline/TextHelpers';
import {updateWithoutHistory} from 'outline/HistoryHelpers';

import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

const CHARACTER_LIMIT = 30;

function toggleOverflowed(node: TextNode, view: View) {
  let textContent = node.getTextContent();
  let replacementNode;
  if (isOverflowedTextNode(node)) {
    replacementNode = createTextNode(textContent);
  } else {
    replacementNode = createOverflowedTextNode(textContent);
  }
  let anchorOffset;
  const selection = view.getSelection();
  if (selection) {
    const anchorNode = selection.getAnchorNode();
    if (anchorNode === node) {
      anchorOffset = selection.anchorOffset;
    }
  }
  node.replace(replacementNode);
  if (anchorOffset !== undefined) {
    replacementNode.select(anchorOffset, anchorOffset);
  }
  return replacementNode;
}

function recursivelySetBlockOverflowedNodes(
  nodes: Array<OutlineNode>,
  view: View,
  value: boolean,
) {
  nodes.forEach((node) => {
    if (isBlockNode(node)) {
      recursivelySetBlockOverflowedNodes(node.getChildren(), view, value);
    } else if (
      isTextNode(node) &&
      isOverflowedTextNode(node) !== value &&
      !node.isImmutable() &&
      !node.isSegmented() &&
      !node.isInert()
    ) {
      toggleOverflowed(node, view);
    }
  });
}

export default function CharacterLimit({
  editor,
}: {
  editor: OutlineEditor,
}): React$Node {
  const [charactersOver, setCharactersOver] = useState(0);
  const currentIntersectionRef = useRef(null);

  const handleTextNodeOverflows = useCallback(() => {
    const characters = editor.getTextContent().length;
    if (characters > CHARACTER_LIMIT) {
      const diff = characters - CHARACTER_LIMIT;
      setCharactersOver(diff);
      updateWithoutHistory(editor, (view: View) => {
        const root = view.getRoot();
        const intersection = findTextIntersectionFromCharacters(
          root,
          CHARACTER_LIMIT,
        );

        if (intersection !== null) {
          const {node, offset: startOffset} = intersection;
          const currentIntersection = currentIntersectionRef.current;
          if (currentIntersection !== null) {
            const {nodeKey: existingOverflowNodeKey, offset: existingOffset} =
              currentIntersection;
            const existingOverflowNode = view.getNodeByKey(
              existingOverflowNodeKey,
            );
            if (isOverflowedTextNode(existingOverflowNode)) {
              if (existingOverflowNodeKey === node.getKey()) {
                if (startOffset > existingOffset) {
                  const offset = startOffset - existingOffset;
                  const [targetNode, nextOverflowNode] =
                    existingOverflowNode.splitText(offset);
                  toggleOverflowed(targetNode, view);
                  currentIntersectionRef.current = {
                    nodeKey: nextOverflowNode.getKey(),
                    offset: 0,
                  };
                } else {
                  // Handle next siblings
                  const parentBlock = node.getParentBlockOrThrow();
                  const siblings = node.getNextSiblings();
                  recursivelySetBlockOverflowedNodes(siblings, view, true);
                  // Handle next sibling blocks
                  const parentBlockSiblings = parentBlock.getNextSiblings();
                  recursivelySetBlockOverflowedNodes(
                    parentBlockSiblings,
                    view,
                    true,
                  );
                }
                return;
              } else {
                toggleOverflowed(existingOverflowNode, view);
                // Handle previous siblings
                const siblings = node.getPreviousSiblings();
                recursivelySetBlockOverflowedNodes(siblings, view, false);
                currentIntersectionRef.current = {
                  nodeKey: node.getKey(),
                  offset: startOffset,
                };
              }
            }
          }
          if (isOverflowedTextNode(node)) {
            return;
          }
          let targetNode = node;
          if (node.isSegmented() || node.isImmutable()) {
            toggleOverflowed(node, view);
          } else {
            if (startOffset !== 0) {
              [, targetNode] = node.splitText(startOffset);
            }
            if (!isOverflowedTextNode(targetNode)) {
              toggleOverflowed(targetNode, view);
            }
          }
          // Handle next siblings
          const siblings = node.getNextSiblings();
          const parentBlock = node.getParentBlockOrThrow();
          recursivelySetBlockOverflowedNodes(siblings, view, true);
          // Handle next sibling blocks
          const parentBlockSiblings = parentBlock.getNextSiblings();
          currentIntersectionRef.current = {
            nodeKey: targetNode.getKey(),
            offset: 0,
          };
          recursivelySetBlockOverflowedNodes(parentBlockSiblings, view, true);
        }
      });
    } else if (charactersOver > 0) {
      currentIntersectionRef.current = null;
      editor.update((view: View) => {
        const textNodes = view.getRoot().getAllTextNodes();
        textNodes.forEach((textNode) => {
          if (isOverflowedTextNode(textNode)) {
            toggleOverflowed(textNode, view);
          }
        });
      }, 'CharacterLimit');
      setCharactersOver(0);
    }
  }, [charactersOver, editor]);

  useEffect(() => {
    handleTextNodeOverflows();
    return editor.addListener('update', handleTextNodeOverflows);
  }, [charactersOver, editor, handleTextNodeOverflows]);

  // Handle garbage collection if the character limit is disabled
  useEffect(() => {
    return () => {
      currentIntersectionRef.current = null;
      editor.update((view: View) => {
        const textNodes = view.getRoot().getAllTextNodes();
        textNodes.forEach((textNode) => {
          if (isOverflowedTextNode(textNode)) {
            toggleOverflowed(textNode, view);
          }
        });
      }, 'CharacterLimit');
      setCharactersOver(0);
    };
  }, [editor]);

  return charactersOver > 0 ? (
    <span className="characters-over">
      Character Limit: <span>-{charactersOver}</span>
    </span>
  ) : null;
}
