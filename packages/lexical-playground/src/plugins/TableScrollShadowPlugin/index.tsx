/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

const SCROLLABLE_WRAPPER_CLASS =
  'PlaygroundEditorTheme__tableScrollableWrapper';
const HAS_SCROLL_RIGHT_CLASS = 'PlaygroundEditorTheme__tableScrollRight';
const HAS_SCROLL_LEFT_CLASS = 'PlaygroundEditorTheme__tableScrollLeft';
const HAS_SCROLL_MIDDLE_CLASS = 'PlaygroundEditorTheme__tableScrollMiddle';

function updateTableScrollState(element: HTMLElement): void {
  const hasScroll = element.scrollWidth > element.clientWidth;
  // Adding and removing 1 and -1 for floating point precision
  const isScrolledToRight =
    element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
  const isScrolledToLeft = element.scrollLeft <= 1;

  // Remove all scroll classes first
  element.classList.remove(HAS_SCROLL_RIGHT_CLASS);
  element.classList.remove(HAS_SCROLL_LEFT_CLASS);
  element.classList.remove(HAS_SCROLL_MIDDLE_CLASS);

  if (hasScroll) {
    // Middle state: not at either edge
    if (!isScrolledToLeft && !isScrolledToRight) {
      element.classList.add(HAS_SCROLL_MIDDLE_CLASS);
    }
    // Right edge
    else if (isScrolledToLeft && !isScrolledToRight) {
      element.classList.add(HAS_SCROLL_RIGHT_CLASS);
    }
    // Left edge
    else if (!isScrolledToLeft && isScrolledToRight) {
      element.classList.add(HAS_SCROLL_LEFT_CLASS);
    }
  }
}

export default function TableScrollShadowPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) {
      return;
    }

    const updateAllTableScrollStates = () => {
      const wrappers = editorElement.querySelectorAll<HTMLElement>(
        `.${SCROLLABLE_WRAPPER_CLASS}`,
      );
      wrappers.forEach(updateTableScrollState);
    };

    // Initial check
    updateAllTableScrollStates();

    // Watch for new table wrappers being added
    const observer = new MutationObserver(() => {
      updateAllTableScrollStates();
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
    });

    // Also watch for resize events on the wrappers themselves
    const resizeObserver = new ResizeObserver(() => {
      updateAllTableScrollStates();
    });

    const scrollHandlers = new Map<HTMLElement, () => void>();

    const addScrollListener = (wrapper: HTMLElement) => {
      if (scrollHandlers.has(wrapper)) {
        return; // Already has a listener
      }
      const handler = () => {
        updateTableScrollState(wrapper);
      };
      wrapper.addEventListener('scroll', handler, {passive: true});
      scrollHandlers.set(wrapper, handler);
    };

    const wrappers = editorElement.querySelectorAll<HTMLElement>(
      `.${SCROLLABLE_WRAPPER_CLASS}`,
    );
    wrappers.forEach((wrapper) => {
      resizeObserver.observe(wrapper);
      addScrollListener(wrapper);
    });

    // Watch for new wrappers to observe
    const wrapperObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains(SCROLLABLE_WRAPPER_CLASS)) {
              resizeObserver.observe(node);
              addScrollListener(node);
              updateTableScrollState(node);
            }

            const childWrappers = node.querySelectorAll<HTMLElement>(
              `.${SCROLLABLE_WRAPPER_CLASS}`,
            );
            childWrappers.forEach((wrapper) => {
              resizeObserver.observe(wrapper);
              addScrollListener(wrapper);
              updateTableScrollState(wrapper);
            });
          }
        });
      });
    });

    wrapperObserver.observe(editorElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      wrapperObserver.disconnect();

      scrollHandlers.forEach((handler, wrapper) => {
        wrapper.removeEventListener('scroll', handler);
      });
      scrollHandlers.clear();
    };
  }, [editor]);

  return null;
}
