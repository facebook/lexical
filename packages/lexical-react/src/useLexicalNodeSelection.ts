/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createNodeSelection,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $setSelection,
} from 'lexical';
import {useCallback, useEffect, useState} from 'react';

function isNodeSelected(editor: LexicalEditor, key: NodeKey): boolean {
  return editor.getEditorState().read(() => {
    const node = $getNodeByKey(key);

    if (node === null) {
      return false;
    }

    return node.isSelected();
  });
}

export function useLexicalNodeSelection(
  key: NodeKey,
): [boolean, (arg0: boolean) => void, () => void] {
  const [editor] = useLexicalComposerContext();

  const [isSelected, setIsSelected] = useState(() =>
    isNodeSelected(editor, key),
  );

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      setIsSelected(isNodeSelected(editor, key));
    });
  }, [editor, key]);

  const setSelected = useCallback(
    (selected: boolean) => {
      editor.update(() => {
        let selection = $getSelection();

        if (!$isNodeSelection(selection)) {
          selection = $createNodeSelection();
          $setSelection(selection);
        }

        if (selected) {
          selection.add(key);
        } else {
          selection.delete(key);
        }
      });
    },
    [editor, key],
  );

  const clearSelected = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();

      if ($isNodeSelection(selection)) {
        selection.clear();
      }
    });
  }, [editor]);

  return [isSelected, setSelected, clearSelected];
}
