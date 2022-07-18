/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey, NodeMutation} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$isHeadingNode, HeadingNode, HeadingTagType} from '@lexical/rich-text';
import {$getNodeByKey, $getRoot, TextNode} from 'lexical';
import {useEffect, useState} from 'react';

function $insertHeadingIntoTableOfContents(
  prevHeading: HeadingNode | null,
  newHeading: HeadingNode | null,
  currentTableOfContents: Array<
    [key: NodeKey, text: string, tag: HeadingTagType]
  >,
): Array<[key: NodeKey, text: string, tag: HeadingTagType]> {
  if (newHeading === null) {
    return currentTableOfContents;
  }
  const newEntry: [key: NodeKey, text: string, tag: HeadingTagType] = [
    newHeading.getKey(),
    newHeading.getTextContent(),
    newHeading.getTag(),
  ];
  let newTableOfContents: Array<
    [key: NodeKey, text: string, tag: HeadingTagType]
  > = [];
  if (prevHeading === null) {
    newTableOfContents = [newEntry, ...currentTableOfContents];
  } else {
    for (let i = 0; i < currentTableOfContents.length; i++) {
      const key = currentTableOfContents[i][0];
      newTableOfContents.push(currentTableOfContents[i]);
      if (key === prevHeading.getKey() && key !== newHeading.getKey()) {
        newTableOfContents.push(newEntry);
      }
    }
  }
  return newTableOfContents;
}

function $deleteHeadingFromTableOfContents(
  key: NodeKey,
  currentTableOfContents: Array<
    [key: NodeKey, text: string, tag: HeadingTagType]
  >,
): Array<[key: NodeKey, text: string, tag: HeadingTagType]> {
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
  currentTableOfContents: Array<
    [key: NodeKey, text: string, tag: HeadingTagType]
  >,
): Array<[key: NodeKey, text: string, tag: HeadingTagType]> {
  const newTextContent = heading.getTextContent();
  const newTableOfContents: Array<
    [key: NodeKey, text: string, tag: HeadingTagType]
  > = [];
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
    values: Array<[key: NodeKey, text: string, tag: HeadingTagType]>,
    editor: LexicalEditor,
  ) => JSX.Element;
};

export default function LexicalTableOfContentsPlugin({
  children,
}: Props): JSX.Element {
  const [tableOfContents, setTableOfContents] = useState<
    Array<[key: NodeKey, text: string, tag: HeadingTagType]>
  >([]);
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    // Set table of contents initial state
    let currentTableOfContents: Array<
      [key: NodeKey, text: string, tag: HeadingTagType]
    > = [];
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
              if (newHeading !== null) {
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
              if (currNode !== null) {
                const parentNode = currNode.getParentOrThrow();
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

  return children(tableOfContents, editor);
}
