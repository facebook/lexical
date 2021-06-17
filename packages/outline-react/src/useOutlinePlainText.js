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
import {createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import {
  onSelectionChange,
  onKeyDownForPlainText,
  onCompositionStart,
  onCompositionEnd,
  onCut,
  onCopy,
  onNativeBeforeInputForPlainText,
  onPasteForPlainText,
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
  ['keydown', onKeyDownForPlainText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCut],
  ['copy', onCopy],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForPlainText],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(
    ['beforeinput', onNativeBeforeInputForPlainText],
    ['input', onNativeInput],
  );
} else {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly: boolean = false,
): {} | {onBeforeInput: (SyntheticInputEvent<EventTarget>) => void} {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
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
        initEditor(editor);
        editor.registerNodeType('paragraph', ParagraphNode);
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
