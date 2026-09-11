/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useCallback} from 'react';

/**
 * Returns a stable `announce` function backed by the editor's
 * {@link AriaLiveRegionExtension} output. Requires
 * `AriaLiveRegionExtension` in the editor's extension tree.
 */
export function useLexicalAriaLiveRegion(): (message: string) => void {
  const [editor] = useLexicalComposerContext();
  return useCallback(
    (message: string) => {
      const dep = getExtensionDependencyFromEditor(
        editor,
        AriaLiveRegionExtension,
      );
      dep.output.announce(message);
    },
    [editor],
  );
}
