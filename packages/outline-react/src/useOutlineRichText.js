/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';

import {useCallback} from 'react';

import {useRichTextSetup} from './shared/useRichTextSetup';
import useOutlineHistory from './shared/useOutlineHistory';

export default function useOutlineRichText(editor: OutlineEditor): () => void {
  const clearEditor = useRichTextSetup(editor, true);
  const clearHistory = useOutlineHistory(editor);

  return useCallback(
    (callbackFn?: () => void) => {
      clearEditor(editor, () => {
        clearHistory();
        if (callbackFn) {
          callbackFn();
        }
      });
    },
    [clearEditor, clearHistory, editor],
  );
}
