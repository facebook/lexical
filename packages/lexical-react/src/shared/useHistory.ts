/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {HistoryOptions, HistoryState} from '@lexical/history';
import type {LexicalEditor} from 'lexical';

import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {useEffect, useMemo} from 'react';

export function useHistory(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  options: HistoryOptions = {
    delay: 1000,
    discardHistory: false,
  },
): void {
  const historyState: HistoryState = useMemo(
    () => externalHistoryState || createEmptyHistoryState(),
    [externalHistoryState],
  );

  useEffect(() => {
    return registerHistory(editor, historyState, options);
  }, [editor, options, historyState]);
}
