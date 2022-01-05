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

import {useCallback} from 'react';

import {useRichTextSetup} from './shared/useRichTextSetup';
import {
  useYjsCollaboration,
  useYjsHistory,
  useYjsFocusTracking,
} from './shared/useYjsCollaboration';

export default function useLexicalRichTextWithCollab(
  editor: LexicalEditor,
  id: string,
  provider: Provider,
  yjsDocMap: Map<string, Doc>,
  name: string,
  color: string,
  skipInit?: boolean,
): [React$Node, () => void, boolean, () => void, () => void] {
  const clearEditor = useRichTextSetup(editor, false);
  const [cursors, binding, connected, connect, disconnect] =
    useYjsCollaboration(editor, id, provider, yjsDocMap, name, color, skipInit);
  const clearHistory = useYjsHistory(editor, binding);
  useYjsFocusTracking(editor, provider);

  return [
    cursors,
    useCallback(
      (callbackFn?: () => void) => {
        clearEditor(editor, () => {
          clearHistory();
          if (callbackFn) {
            callbackFn();
          }
        });
      },
      [clearEditor, clearHistory, editor],
    ),
    connected,
    connect,
    disconnect,
  ];
}
