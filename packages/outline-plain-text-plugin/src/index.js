// @flow strict-local

import type {OutlineEditor} from 'outline';

import {useEffect, useRef} from 'react';
import {onFocusIn, useEditorInputEvents, useEvent} from 'plugin-shared';

export function usePlainTextPlugin(
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

  const inputEvents = useEditorInputEvents(editor, pluginStateRef);
  useEvent(editor, 'focusin', onFocusIn, pluginStateRef);
  return inputEvents;
}
