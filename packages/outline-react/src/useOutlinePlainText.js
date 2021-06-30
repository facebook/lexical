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
  onBeforeInputForPlainText,
  onPasteForPlainText,
  onDropPolyfill,
  onDragStartPolyfill,
  onInput,
  onMutation,
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

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDownForPlainText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCut],
  ['copy', onCopy],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForPlainText],
  ['beforeinput', onBeforeInputForPlainText],
  ['input', onInput],
];

if (!CAN_USE_BEFORE_INPUT) {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly?: boolean = false,
): void {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
    }),
    [],
  );

  useEffect(() => {
    eventHandlerState.isReadOnly = isReadOnly;
  }, [isReadOnly, eventHandlerState]);

  useEffect(() => {
    const removeElementListner = editor.addEditorElementListener(
      (editorElement) => {
        if (editorElement !== null) {
          initEditor(editor);
          editor.registerNodeType('paragraph', ParagraphNode);
        }
      },
    );
    const observer = new MutationObserver(onMutation.bind(null, editor));
    const removeMutationListener = editor.addMutationListener(() => {
      observer.disconnect();

      return (editorElement: HTMLElement) => {
        observer.observe(editorElement, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      };
    });

    return () => {
      removeMutationListener();
      removeElementListner();
    };
  }, [editor]);

  useOutlineEditorEvents(events, editor, eventHandlerState);
  useOutlineDragonSupport(editor);
  useOutlineHistory(editor);
}
