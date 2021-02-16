// @flow

import type {OutlineEditor, ViewModel, View, OutlineNode} from 'outline';

import * as React from 'react';

import {TextNode, BlockNode} from 'outline';
import {useEffect, useRef, useState} from 'react';
import {findTextIntersectionFromCharacters} from 'outline-react/OutlineTextHelpers';

const CHARACTER_LIMIT = 3;

function recursivelySetBlockOverflowedNodes(
  blockNode: BlockNode,
  nodes: Array<OutlineNode>,
  value: boolean,
) {
  nodes.forEach((node) => {
    if (node instanceof BlockNode) {
      recursivelySetBlockOverflowedNodes(node, node.getChildren(), value);
    } else if (node instanceof TextNode && node.isOverflowed() !== value) {
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

  useEffect(() => {
    return editor.addUpdateListener((viewModel: ViewModel) => {
      const characters = editor.getTextContent().length;
      if (characters > CHARACTER_LIMIT) {
        const diff = characters - CHARACTER_LIMIT;
        setCharactersOver(diff);
        editor.update((view: View) => {
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
                existingOverflowNode instanceof TextNode &&
                existingOverflowNode.isOverflowed()
              ) {
                if (existingOverflowNodeKey === node.getKey()) {
                  if (startOffset > existingOffset) {
                    const offset = startOffset - existingOffset;
                    const [
                      targetNode,
                      nextOverflowNode,
                    ] = existingOverflowNode.splitText(offset);
                    targetNode.toggleOverflowed();
                    const parent = targetNode.getTopParentBlockOrThrow();
                    parent.normalizeTextNodes(true);
                    currentIntersectionRef.current = {
                      nodeKey: nextOverflowNode.getKey(),
                      offset: 0,
                    };
                  }
                } else {
                  existingOverflowNode.toggleOverflowed();
                  // Handle previous siblings
                  const siblings = node.getPreviousSiblings();
                  const parent = node.getTopParentBlockOrThrow();
                  recursivelySetBlockOverflowedNodes(parent, siblings, false);
                }
                return;
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
              if (!targetNode.isOverflowed()) {
                targetNode.toggleOverflowed();
              }
            }
            // Handle next siblings
            const siblings = node.getNextSiblings();
            const parent = node.getTopParentBlockOrThrow();
            recursivelySetBlockOverflowedNodes(parent, siblings, true);
            // Handle next sibling blocks
            const parentBlock = parent.getParentBlockOrThrow();
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
    });
  }, [charactersOver, editor]);

  return charactersOver > 0 ? (
    <span className="characters-over">
      Character Limit: <span>-{charactersOver}</span>
    </span>
  ) : null;
}
