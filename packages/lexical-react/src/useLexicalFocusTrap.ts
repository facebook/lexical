/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusTrapExtension, type FocusTrapInitialFocus} from '@lexical/a11y';
import {batch, getExtensionDependencyFromEditor} from '@lexical/extension';
import {RefObject, useEffect} from 'react';

import {useLexicalComposerContext} from './LexicalComposerContext';

export type {FocusTrapInitialFocus} from '@lexical/a11y';

/**
 * React adapter for {@link FocusTrapExtension}. Drives the extension's
 * `container` / `initialFocus` signals so the trap activates while
 * `isActive` is `true` and deactivates on cleanup.
 *
 * Requires `FocusTrapExtension` in the editor's extension tree.
 */
export function useLexicalFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  initialFocus: FocusTrapInitialFocus = 'firstFocusable',
): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const dep = getExtensionDependencyFromEditor(editor, FocusTrapExtension);
    batch(() => {
      dep.output.container.value = isActive ? containerRef.current : null;
      dep.output.initialFocus.value = initialFocus;
    });
    return () => {
      batch(() => {
        dep.output.container.value = null;
        dep.output.initialFocus.value = 'firstFocusable';
      });
    };
  }, [editor, isActive, containerRef, initialFocus]);
}
