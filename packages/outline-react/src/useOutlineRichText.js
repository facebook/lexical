// @flow strict-local

import type {OutlineEditor, Selection} from 'outline';

import {useEffect, useRef} from 'react';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import useOutlineFocusIn from 'outline-react/useOutlineFocusIn';
import {HeadingNode} from 'outline-extensions/HeadingNode';
import {ListNode} from 'outline-extensions/ListNode';
import {QuoteNode} from 'outline-extensions/QuoteNode';

export default function useOutlineRichText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const pluginStateRef = useRef<{
    isReadOnly: boolean,
    richText: true,
    compositionSelection: null | Selection,
  } | null>(null);

  // Handle event plugin state
  useEffect(() => {
    const pluginsState = pluginStateRef.current;

    if (pluginsState === null) {
      pluginStateRef.current = {
        isReadOnly,
        richText: true,
        compositionSelection: null,
      };
    } else {
      pluginsState.isReadOnly = isReadOnly;
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (editor !== null) {
      const removeHeadingType = editor.addNodeType('heading', HeadingNode);
      const removeListType = editor.addNodeType('list', ListNode);
      const removeQuoteType = editor.addNodeType('quote', QuoteNode);

      return () => {
        removeHeadingType();
        removeListType();
        removeQuoteType();
      };
    }
  }, [editor]);

  const inputEvents = useOutlineInputEvents(editor, pluginStateRef);
  useOutlineFocusIn(editor, pluginStateRef);
  return inputEvents;
}
