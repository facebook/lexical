/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {BlockNode, OutlineEditor, View, OutlineNode} from 'outline';

import * as React from 'react';

import {isBlockNode, isTextNode} from 'outline';
import {useCallback, useEffect, useRef, useState} from 'react';
import {findTextIntersectionFromCharacters} from 'outline/TextHelpers';
import {updateWithoutHistory} from 'outline/HistoryHelpers';

const CHARACTER_LIMIT = 30;

function recursivelySetBlockOverflowedNodes(
  blockNode: BlockNode,
  nodes: Array<OutlineNode>,
  value: boolean,
) {
  nodes.forEach((node) => {
    if (isBlockNode(node)) {
      recursivelySetBlockOverflowedNodes(node, node.getChildren(), value);
    } else if (
      isTextNode(node) &&
      node.isOverflowed() !== value &&
      !node.isImmutable() &&
      !node.isSegmented() &&
      !node.isInert()
    ) {
      node.toggleOverflowed();
    }
  });
  // Merge text nodes where possible
  blockNode.normalizeTextNodes(value);
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
            const {
              nodeKey: existingOverflowNodeKey,
              // eslint-disable-next-line no-unused-vars
              offset: existingOffset,
            } = currentIntersection;
            const existingOverflowNode = view.getNodeByKey(
              existingOverflowNodeKey,
            );
            // existingOverflowNode and is always a TextNode, we do this for Flow
            if (
              isTextNode(existingOverflowNode) &&
              existingOverflowNode.isOverflowed()
            ) {
              if (existingOverflowNodeKey === node.getKey()) {
                if (startOffset > existingOffset) {
                  const offset = startOffset - existingOffset;
                  const [targetNode, nextOverflowNode] =
                    existingOverflowNode.splitText(offset);
                  if (nextOverflowNode != null) {
                    targetNode.toggleOverflowed();
                    const parentBlock = targetNode.getParentBlockOrThrow();
                    parentBlock.normalizeTextNodes(true);
                    currentIntersectionRef.current = {
                      nodeKey: nextOverflowNode.getKey(),
                      offset: 0,
                    };
                  }
                } else {
                  // Handle next siblings
                  const parentBlock = node.getParentBlockOrThrow();
                  const siblings = node.getNextSiblings();
                  recursivelySetBlockOverflowedNodes(
                    parentBlock,
                    siblings,
                    true,
                  );
                  // Handle next sibling blocks
                  const parentBlockSiblings = parentBlock.getNextSiblings();
                  recursivelySetBlockOverflowedNodes(
                    parentBlock,
                    parentBlockSiblings,
                    true,
                  );
                }
                return;
              } else {
                existingOverflowNode.toggleOverflowed();
                existingOverflowNode
                  .getParentBlockOrThrow()
                  .normalizeTextNodes(true);
                // Handle previous siblings
                const siblings = node.getPreviousSiblings();
                const parent = node.getTopParentBlockOrThrow();
                recursivelySetBlockOverflowedNodes(parent, siblings, false);
                currentIntersectionRef.current = {
                  nodeKey: node.getKey(),
                  offset: startOffset,
                };
              }
            }
          }
          if (node.isOverflowed()) {
            return;
          }
          let targetNode = node;
          if (node.isSegmented() || node.isImmutable()) {
            node.toggleOverflowed();
          } else {
            if (startOffset !== 0) {
              [, targetNode] = node.splitText(startOffset);
            }
            if (targetNode != null && !targetNode.isOverflowed()) {
              targetNode.toggleOverflowed();
            }
          }
          if (targetNode == null) {
            return;
          }
          // Handle next siblings
          const siblings = node.getNextSiblings();
          const parentBlock = node.getParentBlockOrThrow();
          recursivelySetBlockOverflowedNodes(parentBlock, siblings, true);
          // Handle next sibling blocks
          const parentBlockSiblings = parentBlock.getNextSiblings();
          currentIntersectionRef.current = {
            nodeKey: targetNode.getKey(),
            offset: 0,
          };
          recursivelySetBlockOverflowedNodes(
            parentBlock,
            parentBlockSiblings,
            true,
          );
        }
      });
    } else if (charactersOver > 0) {
      currentIntersectionRef.current = null;
      editor.update((view: View) => {
        const textNodes = view.getRoot().getAllTextNodes();
        textNodes.forEach((textNode) => {
          if (textNode.isOverflowed()) {
            textNode.toggleOverflowed();
          }
        });
      });
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
          if (textNode.isOverflowed()) {
            textNode.toggleOverflowed();
          }
        });
      });
      setCharactersOver(0);
    };
  }, [editor]);

  return charactersOver > 0 ? (
    <span className="characters-over">
      Character Limit: <span>-{charactersOver}</span>
    </span>
  ) : null;
}
