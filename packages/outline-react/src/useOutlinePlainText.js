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
import useOutlineEditorEvents from 'outline-react/useOutlineEditorEvents';
import {
  createParagraphNode,
  ParagraphNode,
} from 'outline-extensions/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'outline-react/OutlineEnv';
import {
  onSelectionChange,
  onKeyDown,
  onKeyUp,
  onPointerDown,
  onPointerUp,
  onCompositionStart,
  onCompositionEnd,
  onCut,
  onCopy,
  onNativeBeforeInput,
  onPastePolyfill,
  onDropPolyfill,
  onDragStartPolyfill,
  onPolyfilledBeforeInput,
} from 'outline-react/OutlineEventHandlers';

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

const emptyObject: {} = {};

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDown],
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
  events.push(['beforeinput', onNativeBeforeInput]);
} else {
  events.push(
    ['paste', onPastePolyfill],
    ['drop', onDropPolyfill],
    ['dragstart', onDragStartPolyfill],
  );
}

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
      richText: false,
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
      initEditor(editor);
      return editor.addNodeType('paragraph', ParagraphNode);
    }
  }, [editor]);

  useOutlineEditorEvents(events, editor, eventHandlerState);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {
        onBeforeInput: (event: SyntheticInputEvent<EventTarget>) => {
          onPolyfilledBeforeInput(event, editor, eventHandlerState);
        },
      };
}
