// @flow

import type {OutlineEditor, View} from 'outline';

import {useCallback, useEffect} from 'react';

function useWrapper<E: Event>(
  handler: (event: E, view: View, editor: OutlineEditor) => void,
  editor: OutlineEditor,
): (event: E) => void {
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
      editor.update((view) => handler(event, view, editor));
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
  useEffect(() => {
    const target = editor.getEditorElement();

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
