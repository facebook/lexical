/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {FocusManagerExtension,type FocusManagerOptions} from '@lexical/a11y';
import {batch, getExtensionDependencyFromEditor} from '@lexical/extension';
import {RefObject, useEffect} from 'react';

import {useLexicalComposerContext} from './LexicalComposerContext';

export type {FocusManagerOptions} from '@lexical/a11y';

/**
 * React adapter for {@link FocusManagerExtension}. Drives the
 * extension's `toolbar` / `toolbarItemSelector` signals so Alt+F10 /
 * Escape navigation activates while `toolbarRef` is mounted.
 *
 * Requires `FocusManagerExtension` in the editor's extension tree.
 */
export function useLexicalFocusManager(
  toolbarRef: RefObject<HTMLElement | null>,
  options: FocusManagerOptions = {},
): void {
  const [editor] = useLexicalComposerContext();
  const {toolbarItemSelector} = options;
  useEffect(() => {
    const dep = getExtensionDependencyFromEditor(editor, FocusManagerExtension);
    batch(() => {
      dep.output.toolbar.value = toolbarRef.current;
      if (toolbarItemSelector !== undefined) {
        dep.output.toolbarItemSelector.value = toolbarItemSelector;
      }
    });
    return () => {
      dep.output.toolbar.value = null;
    };
  }, [editor, toolbarRef, toolbarItemSelector]);
}
