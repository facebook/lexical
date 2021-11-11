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
import useYjsCollaboration from './shared/useYjsCollaboration';

export default function useOutlineRichTextWithCollab(
  editor: OutlineEditor,
): () => void {
  const clearEditor = useRichTextSetup(editor, false);
  useYjsCollaboration(editor);

  return useCallback(
    (callbackFn?: () => void) => {
      clearEditor(editor, () => {
        if (callbackFn) {
          callbackFn();
        }
      });
    },
    [clearEditor, editor],
  );
}
