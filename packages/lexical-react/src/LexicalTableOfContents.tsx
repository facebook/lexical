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
import {$dfs} from '@lexical/utils';
import {$getNodeByKey, $getRoot, TextNode} from 'lexical';
import {useEffect, useState} from 'react';

export type TableOfContentsEntry = [
  key: NodeKey,
  text: string,
  tag: HeadingTagType,
];

function toEntry(heading: HeadingNode): TableOfContentsEntry {
  return [heading.getKey(), heading.getTextContent(), heading.getTag()];
}

function $newTableOfContents(
  headings: Array<HeadingNode>,
): Array<TableOfContentsEntry> {
  const newTableOfContents: Array<TableOfContentsEntry> = [];

  for (const heading of headings) {
    const newEntry: TableOfContentsEntry = toEntry(heading);
    newTableOfContents.push(newEntry);
  }
  return newTableOfContents;
}

function $updateHeadingInTableOfContents(
  heading: HeadingNode,
  currentTableOfContents: Array<TableOfContentsEntry>,
): Array<TableOfContentsEntry> {
  const newTableOfContents: Array<TableOfContentsEntry> = [];
  for (const oldHeading of currentTableOfContents) {
    if (oldHeading[0] === heading.getKey()) {
      newTableOfContents.push(toEntry(heading));
    } else {
      newTableOfContents.push(oldHeading);
    }
  }
  return newTableOfContents;
}

type Props = {
  children: (
    values: Array<TableOfContentsEntry>,
    editor: LexicalEditor,
  ) => JSX.Element;
};

export default function LexicalTableOfContentsPlugin({
  children,
}: Props): JSX.Element {
  const [tableOfContents, setTableOfContents] = useState<
    Array<TableOfContentsEntry>
  >([]);
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    // Set table of contents initial state
    let currentTableOfContents: Array<TableOfContentsEntry> = [];
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
      (_: Map<string, NodeMutation>) => {
        editor.getEditorState().read(() => {
          const headingNodes: HeadingNode[] = $dfs().reduce(
            (acc, {node}) => ($isHeadingNode(node) ? [...acc, node] : acc),
            [] as HeadingNode[],
          );
          currentTableOfContents = $newTableOfContents(headingNodes);
          setTableOfContents(currentTableOfContents);
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
