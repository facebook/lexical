/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, Selection} from 'outline';

import {useEffect, useRef} from 'react';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import useOutlineFocusIn from 'outline-react/useOutlineFocusIn';
import {HeadingNode} from 'outline-extensions/HeadingNode';
import {ListNode} from 'outline-extensions/ListNode';
import {QuoteNode} from 'outline-extensions/QuoteNode';
import {ParagraphNode} from 'outline-extensions/ParagraphNode';
import {ListItemNode} from 'outline-extensions/ListItemNode';

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
      const removeParagraphType = editor.addNodeType(
        'paragraph',
        ParagraphNode,
      );
      const removeListItemType = editor.addNodeType('listitem', ListItemNode);

      return () => {
        removeHeadingType();
        removeListType();
        removeQuoteType();
        removeParagraphType();
        removeListItemType();
      };
    }
  }, [editor]);

  const inputEvents = useOutlineInputEvents(editor, pluginStateRef);
  useOutlineFocusIn(editor, pluginStateRef);
  return inputEvents;
}
