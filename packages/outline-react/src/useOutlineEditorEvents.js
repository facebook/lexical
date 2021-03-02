/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {
  EventHandler,
  EventHandlerState,
} from 'outline-react/OutlineEventHandlers';

import {useEffect} from 'react';
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

export type InputEvents = Array<[string, EventHandler]>;

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

export default function useOutlineEditorEvents(
  editor: OutlineEditor,
  state: EventHandlerState,
): {} | {onBeforeInput: (event: SyntheticInputEvent<>) => void} {
  useEffect(() => {
    if (editor !== null) {
      const target: null | HTMLElement = editor.getEditorElement();

      if (target !== null && state !== null) {
        const teardown = events.map(([eventName, handler]) => {
          let eventTarget = target;
          if (
            eventName === 'selectionchange' ||
            eventName === 'keyup' ||
            eventName === 'pointerup' ||
            eventName === 'pointercancel'
          ) {
            eventTarget = target.ownerDocument;
          }
          const handlerWrapper = (event: Event) => {
            handler(event, editor, state);
          };
          eventTarget.addEventListener(eventName, handlerWrapper);
          return () => {
            eventTarget.removeEventListener(eventName, handlerWrapper);
          };
        });

        return () => {
          teardown.forEach((destroy) => destroy());
        };
      }
    }
  }, [editor, state]);

  return CAN_USE_BEFORE_INPUT
    ? emptyObject
    : {
        onBeforeInput: (event: SyntheticInputEvent<EventTarget>) => {
          onPolyfilledBeforeInput(event, editor, state);
        },
      };
}
