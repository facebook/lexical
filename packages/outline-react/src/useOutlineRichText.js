/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {EventHandlerState} from './shared/EventHandlers';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {useEffect, useMemo} from 'react';
import {createTextNode} from 'outline';
import useOutlineEditorEvents from './useOutlineEditorEvents';
import {HeadingNode} from 'outline/HeadingNode';
import {ListNode} from 'outline/ListNode';
import {QuoteNode} from 'outline/QuoteNode';
import {CodeNode} from 'outline/CodeNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {ListItemNode} from 'outline/ListItemNode';
import {createParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import {
  onSelectionChange,
  onKeyDownForRichText,
  onCompositionStart,
  onCompositionEnd,
  onCut,
  onCopy,
  onNativeBeforeInputForRichText,
  onPasteForRichText,
  onDropPolyfill,
  onDragStartPolyfill,
  onPolyfilledBeforeInput,
  onNativeInput,
} from './shared/EventHandlers';
import useOutlineDragonSupport from './shared/useOutlineDragonSupport';
import useOutlineHistory from './shared/useOutlineHistory';

function initEditor(editor: OutlineEditor): void {
  editor.update((view) => {
    const root = view.getRoot();

    if (root.getFirstChild() === null) {
      const text = createTextNode();
      root.append(createParagraphNode().append(text));
    }
  });
}

const emptyObject: {} = {};

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDownForRichText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCut],
  ['copy', onCopy],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForRichText],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(
    ['beforeinput', onNativeBeforeInputForRichText],
    ['input', onNativeInput],
  );
} else {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlineRichText(
  editor: OutlineEditor,
  isReadOnly?: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
      richText: true,
      compositionSelection: null,
    }),
    [],
  );

  useEffect(() => {
    eventHandlerState.isReadOnly = isReadOnly;
  }, [isReadOnly, eventHandlerState]);

  useEffect(() => {
    return editor.addEditorElementListener((editorElement) => {
      if (editorElement !== null) {
        editor.registerNodeType('heading', HeadingNode);
        editor.registerNodeType('list', ListNode);
        editor.registerNodeType('quote', QuoteNode);
        editor.registerNodeType('code', CodeNode);
        editor.registerNodeType('paragraph', ParagraphNode);
        editor.registerNodeType('listitem', ListItemNode);
        initEditor(editor);
      }
    });
  }, [editor]);

  useOutlineEditorEvents(events, editor, eventHandlerState);
  useOutlineDragonSupport(editor);
  useOutlineHistory(editor);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {
        onBeforeInput: (event: SyntheticInputEvent<EventTarget>) => {
          onPolyfilledBeforeInput(event, editor, eventHandlerState);
        },
      };
}
