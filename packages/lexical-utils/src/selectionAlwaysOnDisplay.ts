/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor} from 'lexical';

import markSelection from './markSelection';

export default function selectionAlwaysOnDisplay(
  editor: LexicalEditor,
): () => void {
  let removeSelectionMark: (() => void) | null = null;

  const onSelectionChange = () => {
    const domSelection = getSelection();
    const domAnchorNode = domSelection && domSelection.anchorNode;
    const editorRootElement = editor.getRootElement();

    const isSelectionInsideEditor =
      domAnchorNode !== null &&
      editorRootElement !== null &&
      editorRootElement.contains(domAnchorNode);

    if (isSelectionInsideEditor) {
      if (removeSelectionMark !== null) {
        removeSelectionMark();
        removeSelectionMark = null;
      }
    } else {
      if (removeSelectionMark === null) {
        removeSelectionMark = markSelection(editor);
      }
    }
  };

  document.addEventListener('selectionchange', onSelectionChange);

  return () => {
    if (removeSelectionMark !== null) {
      removeSelectionMark();
    }
    document.removeEventListener('selectionchange', onSelectionChange);
  };
}
