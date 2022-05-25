/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {HistoryState} from '@lexical/history';
import type {LexicalEditor} from 'lexical';

import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

export function useLexicalHistory(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  delay = 1000,
): void {
  return useHistory(editor, externalHistoryState, delay);
}
