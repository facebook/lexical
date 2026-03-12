/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalEditor, mergeRegister} from 'lexical';

import markSelection from './markSelection';

function noop() {}

export default function selectionAlwaysOnDisplay(
  editor: LexicalEditor,
  onReposition?: (node: readonly HTMLElement[]) => void,
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
        removeSelectionMark = markSelection(editor, onReposition);
      }
    }
  };

  let unregister = noop;
  return mergeRegister(
    editor.registerRootListener((rootElement) => {
      unregister();
      unregister = noop;
      if (rootElement) {
        const document = rootElement.ownerDocument;
        document.addEventListener('selectionchange', onSelectionChange);
        onSelectionChange();
        unregister = () => {
          if (removeSelectionMark !== null) {
            removeSelectionMark();
          }
          document.removeEventListener('selectionchange', onSelectionChange);
        };
      }
    }),
    () => unregister(),
  );
}
