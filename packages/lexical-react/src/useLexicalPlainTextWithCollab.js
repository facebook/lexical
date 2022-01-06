/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';
import type {Provider} from 'lexical-yjs';
import type {Doc} from 'yjs';

import usePlainTextSetup from './shared/usePlainTextSetup';
import {
  useYjsCollaboration,
  useYjsHistory,
  useYjsFocusTracking,
} from './shared/useYjsCollaboration';

export default function useLexicalPlainTextWithCollab(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  yjsDocMap: Map<string, Doc>,
  name: string,
  color: string,
  skipInit?: boolean,
): React$Node {
  usePlainTextSetup(editor, false);
  const [cursors, binding] = useYjsCollaboration(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
    skipInit,
  );
  useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider);

  return cursors;
}
