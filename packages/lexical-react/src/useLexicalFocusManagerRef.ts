/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusManagerExtension, type FocusManagerOptions} from '@lexical/a11y';
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type RefCallback, useCallback, useRef} from 'react';

export type {FocusManagerOptions} from '@lexical/a11y';

/**
 * Returns a `RefCallback` that registers the attached DOM element as a
 * focus-managed toolbar with {@link FocusManagerExtension}. Attach it
 * to a toolbar element via `ref=`:
 *
 * ```tsx
 * const toolbarRef = useLexicalFocusManagerRef();
 * return <div ref={toolbarRef} role="toolbar">…</div>;
 * ```
 *
 * Multiple elements can use this hook simultaneously — each gets its
 * own independent Alt+F10 / Escape handler.
 *
 * Requires `FocusManagerExtension` in the editor's extension tree.
 */
export function useLexicalFocusManagerRef(
  options: FocusManagerOptions = {},
): RefCallback<HTMLElement> {
  const [editor] = useLexicalComposerContext();
  const {toolbarItemSelector} = options;
  const prevRef = useRef<HTMLElement | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      const dep = getExtensionDependencyFromEditor(
        editor,
        FocusManagerExtension,
      );
      const map = new Map(dep.output.toolbars.value);

      if (prevRef.current !== null) {
        map.delete(prevRef.current);
      }
      if (node !== null) {
        map.set(node, {toolbarItemSelector});
      }

      prevRef.current = node;
      dep.output.toolbars.value = map;
    },
    [editor, toolbarItemSelector],
  );
}
