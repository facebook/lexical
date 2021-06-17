/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor} from 'outline';
import type {EventHandler, EventHandlerState} from './shared/EventHandlers';

import {useEffect, useRef} from 'react';

export type InputEvents = Array<[string, EventHandler]>;

function getTarget(eventName: string, editorElement: HTMLElement): EventTarget {
  return eventName === 'selectionchange' ||
    eventName === 'keyup' ||
    eventName === 'pointerup' ||
    eventName === 'pointercancel'
    ? editorElement.ownerDocument
    : editorElement;
}

export default function useOutlineEditorEvents(
  events: InputEvents,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
  const prevEditorElementRef = useRef<null | HTMLElement>(null);
  useEffect(() => {
    const create = [];
    const destroy = [];

    for (let i = 0; i < events.length; i++) {
      const [eventName, handler] = events[i];

      const handlerWrapper = (event: Event) => {
        handler(event, editor, state);
      };
      create.push((editorElement: HTMLElement) => {
        getTarget(eventName, editorElement).addEventListener(
          eventName,
          handlerWrapper,
        );
      });
      destroy.push((editorElement: HTMLElement) => {
        getTarget(eventName, editorElement).removeEventListener(
          eventName,
          handlerWrapper,
        );
      });
    }

    return editor.addEditorElementListener(
      (nextEditorElement: null | HTMLElement) => {
        const prevEditorElement = prevEditorElementRef.current;
        if (prevEditorElement !== null) {
          destroy.forEach((fn) => fn(prevEditorElement));
        }
        if (nextEditorElement !== null) {
          create.forEach((fn) => fn(nextEditorElement));
        }
        prevEditorElementRef.current = nextEditorElement;
      },
    );
  }, [editor, events, state]);
}
