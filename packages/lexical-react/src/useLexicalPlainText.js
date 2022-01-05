/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';
import type {HistoryState} from './useLexicalHistory';

import {useCallback} from 'react';

import usePlainTextSetup from './shared/usePlainTextSetup';
import {useLexicalHistory} from './useLexicalHistory';

export default function useLexicalPlainText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
): () => void {
  const clearEditor = usePlainTextSetup(editor, true);
  const clearHistory = useLexicalHistory(editor, externalHistoryState);

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
