/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getRoot,
  $isTextNode,
  type EditorState,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import useLayoutEffect from './shared/useLayoutEffect';

type LexicalInternalNode = LexicalNode & {
  __format?: number;
  __parent?: string;
};

export function OnChangePlugin({
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  onChange,
}: {
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (
    editorState: EditorState,
    editor: LexicalEditor,
    tags: Set<string>,
  ) => void;
}): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    if (onChange) {
      return editor.registerUpdateListener(
        ({editorState, dirtyElements, dirtyLeaves, prevEditorState, tags}) => {
          if (
            (ignoreSelectionChange &&
              dirtyElements.size === 0 &&
              dirtyLeaves.size === 0) ||
            (ignoreHistoryMergeTagChange && tags.has(HISTORY_MERGE_TAG)) ||
            prevEditorState.isEmpty()
          ) {
            return;
          }

          let isContentUnchanged = false;

          prevEditorState.read(() => {
            const prevText = $getRoot().getTextContent();

            editorState.read(() => {
              const currentText = $getRoot().getTextContent();

              if (prevText === currentText) {
                let hasFormatChange = false;

                for (const key of dirtyLeaves.keys()) {
                  const prevNode = prevEditorState._nodeMap.get(key) as
                    | LexicalInternalNode
                    | undefined;
                  const currentNode = editorState._nodeMap.get(key) as
                    | LexicalInternalNode
                    | undefined;

                  if (prevNode && currentNode) {
                    const prevFormat =
                      prevNode.__format ??
                      ($isTextNode(prevNode) ? prevNode.getFormat() : null);
                    const currentFormat =
                      currentNode.__format ??
                      ($isTextNode(currentNode)
                        ? currentNode.getFormat()
                        : null);

                    if (
                      prevFormat !== null &&
                      currentFormat !== null &&
                      prevFormat !== currentFormat
                    ) {
                      hasFormatChange = true;
                      break;
                    }
                  }
                }

                if (!hasFormatChange) {
                  const parentKeys = new Set<string>();
                  const dirtyKeys = new Set<string>([
                    ...Array.from(dirtyElements.keys()),
                    ...Array.from(dirtyLeaves.keys()),
                  ]);

                  for (const key of dirtyKeys) {
                    const prevNode = prevEditorState._nodeMap.get(key) as
                      | LexicalInternalNode
                      | undefined;
                    if (
                      prevNode &&
                      '_parent' in prevNode &&
                      prevNode.__parent
                    ) {
                      parentKeys.add(prevNode.__parent);
                    }

                    const currentNode = editorState._nodeMap.get(key) as
                      | LexicalInternalNode
                      | undefined;
                    if (
                      currentNode &&
                      '_parent' in currentNode &&
                      currentNode.__parent
                    ) {
                      parentKeys.add(currentNode.__parent);
                    }
                  }

                  let prevParentsJSON = '';
                  let currentParentsJSON = '';

                  for (const parentKey of parentKeys) {
                    const prevParent = prevEditorState._nodeMap.get(parentKey);
                    const currentParent = editorState._nodeMap.get(parentKey);

                    if (prevParent) {
                      prevParentsJSON += JSON.stringify(
                        prevParent.exportJSON(),
                      );
                    }
                    if (currentParent) {
                      currentParentsJSON += JSON.stringify(
                        currentParent.exportJSON(),
                      );
                    }
                  }

                  if (prevParentsJSON === currentParentsJSON) {
                    isContentUnchanged = true;
                  }
                }
              }
            });
          });

          if (isContentUnchanged) {
            return;
          }

          onChange(editorState, editor, tags);
        },
      );
    }
  }, [editor, ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange]);

  return null;
}
