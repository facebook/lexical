// @flow strict-local

import type {OutlineEditor, Selection} from 'outline';

import {useEffect, useRef} from 'react';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import useOutlineFocusIn from 'outline-react/useOutlineFocusIn';

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginStateRef = useRef<{
    isReadOnly: boolean,
    richText: false,
    compositionSelection: null | Selection,
  } | null>(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isReadOnly,
        richText: false,
        compositionSelection: null,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  const inputEvents = useOutlineInputEvents(editor, pluginStateRef);
  useOutlineFocusIn(editor, pluginStateRef);
  return inputEvents;
}
