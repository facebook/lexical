/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {LexicalEditor, RangeSelection} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $isRangeSelection} from 'lexical';
import React, {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const useCombobox = (editor: LexicalEditor): React$Node => {
  useEffect(() => {
    let previousText = null;
    const removeUpdateListener = editor.registerUpdateListener(
      ({editorState}) => {
        const text = getMentionsTextToSearch(editor);
        if (text === previousText) {
          return;
        }
        previousText = text;
        editor.getEditorState().read(() => {
          const selection = $getSelection();
          console.log(text, selection);
        });
      },
    );
    return () => {
      removeUpdateListener();
    };
  }, [editor]);

  return null;
};

export default function MentionsPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();

  // console.log(editor);
  return useCombobox(editor);
}

function getMentionsTextToSearch(editor: LexicalEditor): string | null {
  let text = null;
  editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return;
    }
    text = getTextUpToAnchor(selection);
  });
  return text;
}

function getTextUpToAnchor(selection: RangeSelection): string | null {
  const anchor = selection.anchor;
  if (anchor.type !== 'text') {
    return null;
  }
  const anchorNode = anchor.getNode();
  // We should not be attempting to extract mentions out of nodes
  // that are already being used for other core things. This is
  // especially true for immutable nodes, which can't be mutated at all.
  if (!anchorNode.isSimpleText()) {
    return null;
  }
  const anchorOffset = anchor.offset;
  return anchorNode.getTextContent().slice(0, anchorOffset);
}
