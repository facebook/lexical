/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, CommandListenerHighPriority} from 'lexical';

import {$log} from 'lexical';
import useLexicalDragonSupport from './useLexicalDragonSupport';
import useLayoutEffect from 'shared/useLayoutEffect';

const BootstrapPriority: CommandListenerHighPriority = 3;

export function initEditor(
  editor: LexicalEditor,
  initialPayloadFn: (LexicalEditor) => void,
): void {
  editor.update(() => {
    $log('initEditor');
    initialPayloadFn(editor);
  });
}

function clearEditor(
  editor: LexicalEditor,
  clearEditorFn: (LexicalEditor) => void,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(
    () => {
      $log('clearEditor');
      clearEditorFn(editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export default function useBootstrapEditor(
  editor: LexicalEditor,
  initialPayloadFn: (LexicalEditor) => void,
  clearEditorFn: (LexicalEditor) => void,
): void {
  useLayoutEffect(() => {
    return editor.addListener(
      'command',
      (type, payload): boolean => {
        if (type === 'bootstrapEditor') {
          initEditor(editor, initialPayloadFn);
          return false;
        }
        if (type === 'clearEditor') {
          clearEditor(editor, clearEditorFn);
          return false;
        }
        return false;
      },
      BootstrapPriority,
    );
  }, [clearEditorFn, editor, initialPayloadFn]);

  useLexicalDragonSupport(editor);
}
