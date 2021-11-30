/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from 'outline';
import type {HistoryState} from './useOutlineHistory';

import {useCallback} from 'react';

import usePlainTextSetup from './shared/usePlainTextSetup';
import {useOutlineHistory} from './useOutlineHistory';

export default function useOutlinePlainText(
  editor: OutlineEditor,
  externalHistoryState?: HistoryState,
): () => void {
  const clearEditor = usePlainTextSetup(editor, true);
  const clearHistory = useOutlineHistory(editor, externalHistoryState);

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
