/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  getDOMSelectionPoints,
  type LexicalEditor,
  mergeRegister,
  registerEventListener,
} from 'lexical';

import markSelection from './markSelection';

export default function selectionAlwaysOnDisplay(
  editor: LexicalEditor,
  onReposition?: (node: readonly HTMLElement[]) => void,
): () => void {
  let removeSelectionMark: (() => void) | null = null;

  const onSelectionChange = () => {
    const editorRootElement = editor.getRootElement();
    // Read the selection from the editor's own document/window so iframe-
    // mounted editors don't fall back to the global one. The selectionchange
    // listener below is registered on rootElement.ownerDocument, so this
    // matches the event's source.
    const targetWindow =
      editorRootElement !== null
        ? editorRootElement.ownerDocument.defaultView
        : null;
    const domSelection =
      targetWindow !== null ? targetWindow.getSelection() : null;
    // Shadow-aware anchor so the contains() check below isn't fooled by the
    // retargeted host.
    const domAnchorNode =
      domSelection !== null
        ? getDOMSelectionPoints(domSelection, editorRootElement).anchorNode
        : null;

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

  return editor.registerRootListener(rootElement => {
    if (rootElement) {
      const document = rootElement.ownerDocument;
      const cleanup = mergeRegister(
        registerEventListener(document, 'selectionchange', onSelectionChange),
        () => {
          if (removeSelectionMark !== null) {
            removeSelectionMark();
          }
        },
      );
      onSelectionChange();
      return cleanup;
    }
  });
}
