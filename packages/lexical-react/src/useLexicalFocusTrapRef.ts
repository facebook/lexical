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
 * activates when `isActive` is `true` and the element is mounted, and is
 * released when the element detaches or `isActive` becomes `false`.
 *
 * ```tsx
 * const trapRef = useLexicalFocusTrapRef(true, 'container');
 * return <div ref={trapRef} tabIndex={-1}>…</div>;
 * ```
 *
 * `allowOutside` is the escape hatch for descendants that portal outside the
 * container (autocomplete popups, tooltips): return `true` for those targets so
 * the trap lets them keep focus instead of pulling it back. It is held in a ref
 * and read at event time, so passing an inline lambda is fine — it does not
 * re-create the trap on every render.
 *
 * Multiple elements can use this hook simultaneously — each gets its
 * own independent focus trap.
 *
 * Requires `FocusTrapExtension` in the editor's extension tree.
 */
export function useLexicalFocusTrapRef(
  isActive: boolean,
  initialFocus: FocusTrapInitialFocus = 'firstFocusable',
  allowOutside?: (target: HTMLElement) => boolean,
): RefCallback<HTMLElement> {
  const [editor] = useLexicalComposerContext();
  const disposeRef = useRef<(() => void) | null>(null);
  // Keep the latest predicate in a ref so an inline lambda doesn't change the
  // RefCallback identity (which would tear down and rebuild the trap every
  // render); the registered trap reads it at event time.
  const allowOutsideRef = useRef(allowOutside);
  allowOutsideRef.current = allowOutside;

  return useCallback(
    (node: HTMLElement | null) => {
      if (disposeRef.current !== null) {
        disposeRef.current();
        disposeRef.current = null;
      }
      if (node !== null && isActive) {
        const dep = getExtensionDependencyFromEditor(
          editor,
          FocusTrapExtension,
        );
        disposeRef.current = dep.output.register(node, {
          allowOutside: target => {
            const fn = allowOutsideRef.current;
            return fn ? fn(target) : false;
          },
          initialFocus,
        });
      }
    },
    [editor, isActive, initialFocus],
  );
}
