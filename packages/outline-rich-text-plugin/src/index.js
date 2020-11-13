// @flow strict-local

import type {OutlineEditor} from 'outline';

import {useEffect, useRef} from 'react';
import {onFocusIn, useEditorInputEvents, useEvent} from 'plugin-shared';

export function useRichTextPlugin(
  editor: null | OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginStateRef = useRef<{isReadOnly: boolean, richText: true} | null>(
    null,
  );

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isReadOnly,
        richText: true,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  const inputEvents = useEditorInputEvents(editor, pluginStateRef);
  useEvent(editor, 'focusin', onFocusIn, pluginStateRef);
  // useEvent(editor, 'selectionchange', onSelectionChange, pluginStateRef);
  return inputEvents;
}
