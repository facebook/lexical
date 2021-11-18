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
import {useYjsCollaboration, useYjsHistory} from './shared/useYjsCollaboration';

export default function useOutlineRichTextWithCollab(
  editor: OutlineEditor,
  id: string,
  provider: Provider,
  yjsDocMap: Map<string, YjsDoc>,
  name: string,
  color: string,
): [React$Node, () => void, boolean] {
  const clearEditor = useRichTextSetup(editor, false);
  const [cursors, binding, connected] = useYjsCollaboration(
    editor,
    id,
    provider,
    yjsDocMap,
    name,
    color,
  );
  const clearHistory = useYjsHistory(editor, binding);

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
  ];
}
