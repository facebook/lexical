/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';

import {useCallback} from 'react';

// $FlowFixMe: TODO
type UnknownEvent = Object;

export default function useOutlineEventWrapper<T>(
  handler: (
    event: UnknownEvent,
    view: View,
    state: ?T,
    editor: OutlineEditor,
  ) => void,
  editor: OutlineEditor,
  stateRef?: RefObject<T>,
): (event: UnknownEvent) => void {
  return useCallback(
    (event) => {
      // Fast-path so we don't do unnecessary work
      if (event.type === 'selectionchange') {
        const selection = window.getSelection();
        const editorElement = editor.getEditorElement();
        if (editorElement && !editorElement.contains(selection.anchorNode)) {
          return;
        }
      }
      const state = stateRef && stateRef.current;
      editor.update((view) => handler(event, view, state, editor));
    },
    [stateRef, editor, handler],
  );
}
