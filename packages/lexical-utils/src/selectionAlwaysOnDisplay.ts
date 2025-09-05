/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalEditor,
  ShadowRootWithComposedRanges,
  ShadowRootWithSelection,
} from 'lexical';

import {DOM_DOCUMENT_FRAGMENT_TYPE} from 'lexical';

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
      if (current.nodeType === DOM_DOCUMENT_FRAGMENT_TYPE) {
        const shadowRoot = current as ShadowRoot;

        // Try modern getComposedRanges API first
        if (
          typeof (shadowRoot as ShadowRootWithComposedRanges)
            .getComposedRanges === 'function'
        ) {
          try {
            const ranges = (shadowRoot as ShadowRootWithComposedRanges)
              .getComposedRanges!({
              shadowRoots: [shadowRoot],
            });
            if (ranges.length > 0) {
              // Create a temporary selection from the composed ranges
              const docSelection = document.getSelection();
              if (docSelection && ranges[0]) {
                try {
                  docSelection.removeAllRanges();
                  const range = document.createRange();
                  range.setStart(
                    ranges[0].startContainer,
                    ranges[0].startOffset,
                  );
                  range.setEnd(ranges[0].endContainer, ranges[0].endOffset);
                  docSelection.addRange(range);
                  domSelection = docSelection;
                } catch (error) {
                  console.warn(
                    'Failed to create selection from composed ranges:',
                    error,
                  );
                }
              }
            }
          } catch (error) {
            console.warn('getComposedRanges failed:', error);
          }
        }

        // Fallback to experimental getSelection if available and no composed ranges worked
        if (
          !domSelection &&
          typeof (shadowRoot as ShadowRootWithSelection).getSelection ===
            'function'
        ) {
          try {
            domSelection = (
              shadowRoot as ShadowRootWithSelection
            ).getSelection();
          } catch (error) {
            console.warn('ShadowRoot.getSelection failed:', error);
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
      if (current.nodeType === DOM_DOCUMENT_FRAGMENT_TYPE) {
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
