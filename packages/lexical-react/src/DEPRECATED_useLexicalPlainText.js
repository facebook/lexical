/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';
import type {HistoryState} from './DEPRECATED_useLexicalHistory';

import usePlainTextSetup from './shared/usePlainTextSetup';
import {useLexicalHistory} from './DEPRECATED_useLexicalHistory';
import useBootstrapEditor from './shared/useBootstrapEditor';

export default function useLexicalPlainText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
): void {
  useBootstrapEditor(editor);
  usePlainTextSetup(editor);
  useLexicalHistory(editor, externalHistoryState);
}
