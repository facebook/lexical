/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {isDocumentFragment, type LexicalEditor} from 'lexical';

import markSelection from './markSelection';

export default function selectionAlwaysOnDisplay(
  editor: LexicalEditor,
): () => void {
  let removeSelectionMark: (() => void) | null = null;

  const onSelectionChange = () => {
    const editorRootElement = editor.getRootElement();
    if (!editorRootElement) {
      return;
    }

    // Get selection from the proper context (shadow DOM or document)
    let domSelection: Selection | null = null;
    let current: Node | null = editorRootElement;
    while (current) {
      if (isDocumentFragment(current.nodeType)) {
        const shadowRoot = current as ShadowRoot;

        // Try modern getComposedRanges API first
        if ('getComposedRanges' in Selection.prototype) {
          const globalSelection = window.getSelection();
          if (globalSelection) {
            const ranges = globalSelection.getComposedRanges({
              shadowRoots: [shadowRoot],
            });
            if (ranges.length > 0) {
              // Use the global selection with composed ranges context
              domSelection = globalSelection;
            }
          }
        }

        break;
      }
      current = current.parentNode;
    }

    if (!domSelection) {
      domSelection = getSelection();
    }

    const domAnchorNode = domSelection && domSelection.anchorNode;

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

  // Get the proper document context for event listeners
  const editorRootElement = editor.getRootElement();
  let targetDocument = document;

  if (editorRootElement) {
    let current: Node | null = editorRootElement;
    while (current) {
      if (isDocumentFragment(current.nodeType)) {
        targetDocument = (current as ShadowRoot).ownerDocument || document;
        break;
      }
      current = current.parentNode;
    }
    targetDocument = editorRootElement.ownerDocument || document;
  }

  targetDocument.addEventListener('selectionchange', onSelectionChange);

  return () => {
    if (removeSelectionMark !== null) {
      removeSelectionMark();
    }
    targetDocument.removeEventListener('selectionchange', onSelectionChange);
  };
}
