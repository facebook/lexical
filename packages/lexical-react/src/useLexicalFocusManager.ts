/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {type FocusManagerOptions, registerFocusManager} from '@lexical/a11y';
import {type LexicalEditor} from 'lexical';
import {RefObject, useEffect} from 'react';

export type {FocusManagerOptions} from '@lexical/a11y';

/**
 * React wrapper around `registerFocusManager` from `@lexical/a11y`.
 *
 * Alt+F10 inside the editor moves focus to the first focusable in
 * `toolbarRef`; Escape inside the toolbar returns focus to the editor.
 * The editor's last selection is preserved across the jump.
 */
export function useLexicalFocusManager(
  editor: LexicalEditor,
  toolbarRef: RefObject<HTMLElement | null>,
  options: FocusManagerOptions = {},
): void {
  const {toolbarItemSelector} = options;
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (toolbar === null) {
      return;
    }
    return registerFocusManager(editor, toolbar, {toolbarItemSelector});
  }, [editor, toolbarRef, toolbarItemSelector]);
}
