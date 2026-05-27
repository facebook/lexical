/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {RefObject, useEffect} from 'react';

const DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR =
  ':scope > button:not([disabled]), :scope > [tabindex="0"]';

export interface FocusManagerOptions {
  /**
   * Selector used to find the toolbar's first focusable item when activating
   * via the shortcut. Defaults to non-disabled direct-child buttons (the same
   * scope used by `useRovingTabIndex`), so the active roving item naturally
   * receives focus.
   */
  toolbarItemSelector?: string;
}

/**
 * Implements the editor-to-toolbar focus jump recommended by the WAI-ARIA
 * APG editor menubar pattern: Alt+F10 inside the editor moves focus to the
 * first focusable in `toolbarRef`, and Escape inside the toolbar returns
 * focus to the editor.
 *
 * The hook only wires the navigation. Selection restoration relies on the
 * editor's own focus handling; the editor's last selection is preserved
 * across the jump so that toolbar commands act on the same range.
 */
export function useFocusManager(
  editor: LexicalEditor,
  toolbarRef: RefObject<HTMLElement | null>,
  options: FocusManagerOptions = {},
): void {
  const selector =
    options.toolbarItemSelector ?? DEFAULT_TOOLBAR_FOCUSABLE_SELECTOR;

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (!event.altKey || event.key !== 'F10') {
          return false;
        }
        const toolbar = toolbarRef.current;
        if (toolbar === null) {
          return false;
        }
        const firstItem = toolbar.querySelector<HTMLElement>(selector);
        if (firstItem === null) {
          return false;
        }
        event.preventDefault();
        firstItem.focus();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, toolbarRef, selector]);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar === null) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      const rootElement = editor.getRootElement();
      if (rootElement === null) {
        return;
      }
      event.preventDefault();
      rootElement.focus();
    };
    toolbar.addEventListener('keydown', handler);
    return () => {
      toolbar.removeEventListener('keydown', handler);
    };
  }, [editor, toolbarRef]);
}
