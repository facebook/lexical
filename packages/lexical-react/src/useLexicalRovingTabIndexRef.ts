/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  RovingTabIndexExtension,
  type RovingTabIndexOptions,
} from '@lexical/a11y';
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type RefCallback, useCallback, useRef} from 'react';

export type {RovingOrientation, RovingTabIndexOptions} from '@lexical/a11y';

/**
 * Returns a `RefCallback` that registers the attached DOM element as a
 * roving-tabindex container with {@link RovingTabIndexExtension}, and
 * releases it when the element detaches.
 *
 * ```tsx
 * const rovingRef = useLexicalRovingTabIndexRef();
 * return <div ref={rovingRef} role="toolbar">…</div>;
 * ```
 *
 * Multiple elements can use this hook simultaneously — each gets its
 * own independent roving group.
 *
 * Requires `RovingTabIndexExtension` in the editor's extension tree.
 */
export function useLexicalRovingTabIndexRef(
  options: RovingTabIndexOptions = {},
): RefCallback<HTMLElement> {
  const [editor] = useLexicalComposerContext();
  const {orientation, itemSelector} = options;
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
          RovingTabIndexExtension,
        );
        disposeRef.current = dep.output.register(node, {
          itemSelector,
          orientation,
        });
      }
    },
    [editor, orientation, itemSelector],
  );
}
