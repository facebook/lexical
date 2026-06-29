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
 * focus-managed toolbar with {@link FocusManagerExtension}, and releases
 * it when the element detaches. Attach it to a toolbar element via `ref=`:
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
  const disposeRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      if (disposeRef.current !== null) {
        disposeRef.current();
        disposeRef.current = null;
      }
      if (node !== null) {
        const dep = getExtensionDependencyFromEditor(
          editor,
          FocusManagerExtension,
        );
        disposeRef.current = dep.output.register(node, {
          toolbarItemSelector,
        });
      }
    },
    [editor, toolbarItemSelector],
  );
}
