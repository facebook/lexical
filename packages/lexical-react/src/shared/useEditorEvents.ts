/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EventHandler, LexicalEditor} from 'lexical';

import useLayoutEffect from 'shared/useLayoutEffect';

export type InputEvents = Array<[string, EventHandler]>;

function getTarget(eventName: string, rootElement: HTMLElement): EventTarget {
  return eventName === 'selectionchange' ||
    eventName === 'keyup' ||
    eventName === 'pointerup' ||
    eventName === 'pointercancel'
    ? rootElement.ownerDocument
    : rootElement;
}

function isRootEditable(editor: LexicalEditor): boolean {
  const rootElement = editor.getRootElement();
  return rootElement !== null && rootElement.contentEditable === 'true';
}

export function useEditorEvents(
  events: InputEvents,
  editor: LexicalEditor,
): void {
  useLayoutEffect(() => {
    const create: Array<(rootElement: HTMLElement) => void> = [];
    const destroy: Array<(rootElement: HTMLElement) => void> = [];

    for (let i = 0; i < events.length; i++) {
      const [eventName, handler] = events[i];

      const handlerWrapper = (event: Event) => {
        if (isRootEditable(editor)) {
          handler(event, editor);
        }
      };

      create.push((rootElement: HTMLElement) => {
        getTarget(eventName, rootElement).addEventListener(
          eventName,
          handlerWrapper,
        );
      });
      destroy.push((rootElement: HTMLElement) => {
        getTarget(eventName, rootElement).removeEventListener(
          eventName,
          handlerWrapper,
        );
      });
    }

    return editor.registerRootListener(
      (
        rootElement: null | HTMLElement,
        prevRootElement: null | HTMLElement,
      ) => {
        if (prevRootElement !== null) {
          destroy.forEach((fn) => fn(prevRootElement));
        }

        if (rootElement !== null) {
          create.forEach((fn) => fn(rootElement));
        }
      },
    );
  }, [editor, events]);
}
