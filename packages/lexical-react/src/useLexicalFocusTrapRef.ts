/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusTrapExtension, type FocusTrapInitialFocus} from '@lexical/a11y';
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type RefCallback, useCallback, useRef} from 'react';

export type {FocusTrapInitialFocus} from '@lexical/a11y';

/**
 * Returns a `RefCallback` that registers the attached DOM element as a
 * focus-trap container with {@link FocusTrapExtension}. The trap
 * activates when `isActive` is `true` and the element is mounted.
 *
 * ```tsx
 * const trapRef = useLexicalFocusTrapRef(true, 'container');
 * return <div ref={trapRef} tabIndex={-1}>…</div>;
 * ```
 *
 * Multiple elements can use this hook simultaneously — each gets its
 * own independent focus trap.
 *
 * Requires `FocusTrapExtension` in the editor's extension tree.
 */
export function useLexicalFocusTrapRef(
  isActive: boolean,
  initialFocus: FocusTrapInitialFocus = 'firstFocusable',
): RefCallback<HTMLElement> {
  const [editor] = useLexicalComposerContext();
  const prevRef = useRef<HTMLElement | null>(null);

  return useCallback(
    (node: HTMLElement | null) => {
      const dep = getExtensionDependencyFromEditor(editor, FocusTrapExtension);
      const map = new Map(dep.output.containers.value);

      if (prevRef.current !== null) {
        map.delete(prevRef.current);
      }
      if (node !== null && isActive) {
        map.set(node, {initialFocus});
      }

      prevRef.current = node;
      dep.output.containers.value = map;
    },
    [editor, isActive, initialFocus],
  );
}
