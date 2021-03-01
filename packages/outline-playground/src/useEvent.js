// @flow

import type {OutlineEditor, View} from 'outline';

import {useCallback, useEffect} from 'react';

function useWrapper(
  handler: (
    event: KeyboardEvent,
    view: View,
    editor: OutlineEditor,
  ) => void,
  editor: OutlineEditor,
): (event: KeyboardEvent) => void {
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

export default function useEvent(
  editor: OutlineEditor,
  eventName: string,
  handler: (event: KeyboardEvent, view: View) => void,
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