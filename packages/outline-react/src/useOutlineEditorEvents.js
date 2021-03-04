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

export type InputEvents = Array<[string, EventHandler]>;

export default function useOutlineEditorEvents(
  events: InputEvents,
  editor: OutlineEditor,
  state: EventHandlerState,
): void {
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
  }, [editor, events, state]);
}
