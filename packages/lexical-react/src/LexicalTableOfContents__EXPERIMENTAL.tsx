/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {NodeKey, NodeMutation} from 'lexical';

import {$isHeadingNode, HeadingNode} from '@lexical/rich-text';
import {$getNodeByKey, $getRoot, TextNode} from 'lexical';
import {useEffect, useState} from 'react';

import {useLexicalComposerContext} from './LexicalComposerContext';

function $insertHeadingIntoTableOfContents(
  prevHeading: HeadingNode | null,
  newHeading: HeadingNode | null,
  currentTableOfContents: Array<[NodeKey, string, string]>,
): Array<[NodeKey, string, string]> {
  if (!newHeading) {
    return currentTableOfContents;
  }
  const newNode: [NodeKey, string, string] = [
    newHeading.getKey(),
    newHeading.getTextContent(),
    newHeading.getTag(),
  ];
  let newTableOfContents: Array<[NodeKey, string, string]> = [];
  if (!prevHeading) {
    newTableOfContents = [newNode, ...currentTableOfContents];
  } else {
    for (let i = 0; i < currentTableOfContents.length; i++) {
      const key = currentTableOfContents[i][0];
      newTableOfContents.push(currentTableOfContents[i]);
      if (key === prevHeading.getKey() && key !== newHeading.getKey()) {
        newTableOfContents.push(newNode);
      }
    }
  }
  return newTableOfContents;
}

function $deleteHeadingFromTableOfContents(
  key: NodeKey,
  currentTableOfContents: Array<[NodeKey, string, string]>,
): Array<[NodeKey, string, string]> {
  const newTableOfContents = [];
  for (const heading of currentTableOfContents) {
    if (heading[0] !== key) {
      newTableOfContents.push(heading);
    }
  }
  return newTableOfContents;
}

function $updateHeadingInTableOfContents(
  heading: HeadingNode,
  currentTableOfContents: Array<[NodeKey, string, string]>,
): Array<[NodeKey, string, string]> {
  const newTextContent = heading.getTextContent();
  const newTableOfContents: Array<[NodeKey, string, string]> = [];
  for (const oldHeading of currentTableOfContents) {
    if (oldHeading[0] === heading.getKey()) {
      newTableOfContents.push([
        heading.getKey(),
        newTextContent,
        heading.getTag(),
      ]);
    } else {
      newTableOfContents.push(oldHeading);
    }
  }
  return newTableOfContents;
}

type Props = {
  children: (
    values: Array<[key: NodeKey, text: string, tag: string]>,
  ) => JSX.Element;
};

export default function LexicalTableOfContentsPlugin({
  children,
}: Props): JSX.Element {
  const [tableOfContents, setTableOfContents] = useState<
    Array<[NodeKey, string, string]>
  >([]);
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    // Set table of contents initial state
    let currentTableOfContents: Array<[NodeKey, string, string]> = [];
    editor.getEditorState().read(() => {
      const root = $getRoot();
      const rootChildren = root.getChildren();
      for (const child of rootChildren) {
        if ($isHeadingNode(child)) {
          currentTableOfContents.push([
            child.getKey(),
            child.getTextContent(),
            child.getTag(),
          ]);
        }
      }
      setTableOfContents(currentTableOfContents);
    });

    // Listen to updates to heading mutations and update state
    const removeHeaderMutationListener = editor.registerMutationListener(
      HeadingNode,
      (mutatedNodes: Map<string, NodeMutation>) => {
        editor.getEditorState().read(() => {
          for (const [nodeKey, mutation] of mutatedNodes) {
            if (mutation === 'created') {
              const newHeading = $getNodeByKey<HeadingNode>(nodeKey);
              if (newHeading) {
                let prevHeading = newHeading.getPreviousSibling();
                while (prevHeading && !$isHeadingNode(prevHeading)) {
                  prevHeading = prevHeading.getPreviousSibling();
                }
                currentTableOfContents = $insertHeadingIntoTableOfContents(
                  prevHeading,
                  newHeading,
                  currentTableOfContents,
                );
                setTableOfContents(currentTableOfContents);
              }
            } else if (mutation === 'destroyed') {
              currentTableOfContents = $deleteHeadingFromTableOfContents(
                nodeKey,
                currentTableOfContents,
              );
              setTableOfContents(currentTableOfContents);
            }
          }
        });
      },
    );

    // Listen to text node mutation updates
    const removeTextNodeMutationListener = editor.registerMutationListener(
      TextNode,
      (mutatedNodes: Map<string, NodeMutation>) => {
        editor.getEditorState().read(() => {
          for (const [nodeKey, mutation] of mutatedNodes) {
            if (mutation === 'updated') {
              const currNode = $getNodeByKey(nodeKey);
              if (currNode) {
                const parentNode = currNode.getParent();
                if ($isHeadingNode(parentNode)) {
                  currentTableOfContents = $updateHeadingInTableOfContents(
                    parentNode,
                    currentTableOfContents,
                  );
                  setTableOfContents(currentTableOfContents);
                }
              }
            }
          }
        });
      },
    );

    return () => {
      removeHeaderMutationListener();
      removeTextNodeMutationListener();
    };
  }, [editor]);

  return children(tableOfContents);
}
