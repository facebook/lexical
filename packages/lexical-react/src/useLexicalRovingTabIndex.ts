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
import {batch, getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {RefObject, useEffect} from 'react';

export type {RovingOrientation, RovingTabIndexOptions} from '@lexical/a11y';

/**
 * React adapter for {@link RovingTabIndexExtension}. Drives the
 * extension's `container` / `orientation` / `itemSelector` signals so
 * the roving-tabindex pattern activates while `containerRef` is mounted.
 *
 * Requires `RovingTabIndexExtension` in the editor's extension tree.
 */
export function useLexicalRovingTabIndex(
  containerRef: RefObject<HTMLElement | null>,
  options: RovingTabIndexOptions = {},
): void {
  const [editor] = useLexicalComposerContext();
  const {orientation, itemSelector} = options;
  useEffect(() => {
    const dep = getExtensionDependencyFromEditor(
      editor,
      RovingTabIndexExtension,
    );
    batch(() => {
      dep.output.container.value = containerRef.current;
      if (orientation !== undefined) {
        dep.output.orientation.value = orientation;
      }
      if (itemSelector !== undefined) {
        dep.output.itemSelector.value = itemSelector;
      }
    });
    return () => {
      batch(() => {
        dep.output.container.value = null;
        dep.output.orientation.value = 'horizontal';
        dep.output.itemSelector.value = null;
      });
    };
  }, [editor, containerRef, orientation, itemSelector]);
}
