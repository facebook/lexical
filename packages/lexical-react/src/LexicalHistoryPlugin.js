/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {HistoryState} from './useLexicalHistory';

import {useLexicalComposerContext} from 'lexical-react/LexicalComposerContext';
import {useLexicalHistory} from 'lexical-react/useLexicalHistory';

export default function HistoryPlugin({
  externalHistoryState,
}: {
  externalHistoryState?: HistoryState,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  useLexicalHistory(editor, externalHistoryState);

  return null;
}
