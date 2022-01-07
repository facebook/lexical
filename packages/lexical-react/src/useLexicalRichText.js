/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from '@lexical/core';
import type {HistoryState} from './useLexicalHistory';

import {useRichTextSetup} from './shared/useRichTextSetup';
import {useLexicalHistory} from './useLexicalHistory';

export default function useLexicalRichText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
): void {
  useRichTextSetup(editor, true);
  useLexicalHistory(editor, externalHistoryState);
}
