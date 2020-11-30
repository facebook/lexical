// @flow strict-local

import type {OutlineEditor} from 'outline';

import {useEffect, useRef} from 'react';
import {onFocusIn, useEditorInputEvents, useEvent} from 'plugin-shared';

import {
  createHeaderNode as createHeader,
  HeaderNode,
} from './OutlineHeaderNode';
import {createImageNode as createImage, ImageNode} from './OutlineImageNode';
import {createQuoteNode as createQuote, QuoteNode} from './OutlineQuoteNode';
import {createListNode as createList, ListNode} from './OutlineListNode';

export function useRichTextPlugin(
  editor: OutlineEditor,
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

  useEffect(() => {
    if (editor !== null) {
      const removeHeaderType = editor.addNodeType('header', HeaderNode);
      const removeListType = editor.addNodeType('list', ListNode);
      return () => {
        removeHeaderType();
        removeListType();
      };
    }
  }, [editor]);

  const inputEvents = useEditorInputEvents(editor, pluginStateRef);
  useEvent(editor, 'focusin', onFocusIn, pluginStateRef);
  return inputEvents;
}

export {
  createHeader,
  createImage,
  createList,
  createQuote,
  HeaderNode,
  ImageNode,
  ListNode,
  QuoteNode,
};
