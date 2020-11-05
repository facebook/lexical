import {useEffect, useRef} from 'react';
import {onFocusIn, useEditorInputEvents, useEvent} from 'shared';

export function usePlainTextPlugin(outlineEditor, isReadOnly = false) {
  const pluginStateRef = useRef(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isReadOnly,
        richText: false,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  const inputEvents = useEditorInputEvents(outlineEditor, pluginStateRef);
  useEvent(outlineEditor, 'focusin', onFocusIn, pluginStateRef);
  // useEvent(outlineEditor, 'selectionchange', onSelectionChange, pluginStateRef);
  return inputEvents;
}
