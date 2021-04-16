/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {EventHandlerState} from 'outline-react/OutlineEventHandlers';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {useEffect, useMemo} from 'react';
import {createTextNode} from 'outline';
import useOutlineEditorEvents from './useOutlineEditorEvents';
import {HeadingNode} from 'outline-extensions/HeadingNode';
import {ListNode} from 'outline-extensions/ListNode';
import {QuoteNode} from 'outline-extensions/QuoteNode';
import {CodeNode} from 'outline-extensions/CodeNode';
import {ParagraphNode} from 'outline-extensions/ParagraphNode';
import {ListItemNode} from 'outline-extensions/ListItemNode';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from './OutlineEnv';
import {
  onSelectionChange,
  onKeyDownForRichText,
  onKeyUp,
  onPointerDown,
  onPointerUp,
  onCompositionStart,
  onCompositionEnd,
  onCut,
  onCopy,
  onNativeBeforeInputForRichText,
  onPastePolyfillForRichText,
  onDropPolyfill,
  onDragStartPolyfill,
  onPolyfilledBeforeInput,
  onNativeInput,
} from './OutlineEventHandlers';
import useOutlineDragonSupport from './useOutlineDragonSupport';
import useOutlineHistory from './useOutlineHistory';

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
  ['keyup', onKeyUp],
  ['pointerdown', onPointerDown],
  ['pointerup', onPointerUp],
  ['pointercancel', onPointerUp],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCut],
  ['copy', onCopy],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(
    ['beforeinput', onNativeBeforeInputForRichText],
    ['input', onNativeInput],
  );
} else {
  events.push(
    ['paste', onPastePolyfillForRichText],
    ['drop', onDropPolyfill],
    ['dragstart', onDragStartPolyfill],
  );
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
      editor.setNodeType('heading', HeadingNode);
      editor.setNodeType('list', ListNode);
      editor.setNodeType('quote', QuoteNode);
      editor.setNodeType('code', CodeNode);
      editor.setNodeType('paragraph', ParagraphNode);
      editor.setNodeType('listitem', ListItemNode);
      initEditor(editor);
    }
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
