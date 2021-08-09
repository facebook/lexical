/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, View} from 'outline';

import {useCallback, useLayoutEffect} from 'react';

function useWrapper<E: Event>(
  handler: (event: E, view: View, editor: OutlineEditor) => void,
  editor: OutlineEditor,
): (event: E) => void {
  return useCallback(
    (event) => {
      // Fast-path so we don't do unnecessary work
      if (event.type === 'selectionchange') {
        const selection = window.getSelection();
        const rootElement = editor.getRootElement();
        if (rootElement && !rootElement.contains(selection.anchorNode)) {
          return;
        }
      }
      editor.update((view) => handler(event, view, editor), event.type);
    },
    [editor, handler],
  );
}

export default function useEvent<E>(
  editor: OutlineEditor,
  eventName: string,
  handler: (event: E, view: View) => void,
): void {
  const wrapper = useWrapper(handler, editor);
  useLayoutEffect(() => {
    const target = editor.getRootElement();

    if (target !== null) {
      // $FlowFixMe
      target.addEventListener(eventName, wrapper);
      return () => {
        // $FlowFixMe
        target.removeEventListener(eventName, wrapper);
      };
    }
  }, [eventName, editor, wrapper]);
}
