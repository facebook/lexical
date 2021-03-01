/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {EventHandlerState} from 'outline-react/useOutlineInputEvents';

import {useEffect, useMemo} from 'react';
import {createTextNode} from 'outline';
import useOutlineInputEvents from 'outline-react/useOutlineInputEvents';
import {HeadingNode} from 'outline-extensions/HeadingNode';
import {ListNode} from 'outline-extensions/ListNode';
import {QuoteNode} from 'outline-extensions/QuoteNode';
import {CodeNode} from 'outline-extensions/CodeNode';
import {ParagraphNode} from 'outline-extensions/ParagraphNode';
import {ListItemNode} from 'outline-extensions/ListItemNode';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

function initEditor(editor: OutlineEditor): void {
  editor.update((view) => {
    const root = view.getRoot();

    if (root.getFirstChild() === null) {
      const text = createTextNode();
      root.append(createParagraphNode().append(text));
      text.select();
    }
  });
}

export default function useOutlineRichText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
      richText: true,
      compositionSelection: null,
      isHandlingPointer: false,
    }),
    [],
  );

  useEffect(() => {
    eventHandlerState.isReadOnly = isReadOnly;
  }, [isReadOnly, eventHandlerState]);

  useEffect(() => {
    if (editor !== null) {
      const removeHeadingType = editor.addNodeType('heading', HeadingNode);
      const removeListType = editor.addNodeType('list', ListNode);
      const removeQuoteType = editor.addNodeType('quote', QuoteNode);
      const removeCodeType = editor.addNodeType('code', CodeNode);
      const removeParagraphType = editor.addNodeType(
        'paragraph',
        ParagraphNode,
      );
      const removeListItemType = editor.addNodeType('listitem', ListItemNode);
      initEditor(editor);

      return () => {
        removeHeadingType();
        removeListType();
        removeQuoteType();
        removeParagraphType();
        removeListItemType();
        removeCodeType();
      };
    }
  }, [editor]);

  return useOutlineInputEvents(editor, eventHandlerState);
}
