/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';
import type {Provider, YjsDoc} from 'outline-yjs';

import {useCallback} from 'react';

import {useRichTextSetup} from './shared/useRichTextSetup';
import useYjsCollaboration from './shared/useYjsCollaboration';

export default function useOutlineRichTextWithCollab(
  editor: OutlineEditor,
  doc: YjsDoc,
  provider: Provider,
): () => void {
  const clearEditor = useRichTextSetup(editor, false);
  useYjsCollaboration(editor, doc, provider);

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
