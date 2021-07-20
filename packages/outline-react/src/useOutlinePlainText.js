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

import {useCallback, useEffect, useMemo} from 'react';
import {createTextNode} from 'outline';
import useOutlineEditorEvents from './useOutlineEditorEvents';
import {
  createParagraphNode,
  ParagraphNode,
  isParagraphNode,
} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import {
  onSelectionChange,
  onKeyDownForPlainText,
  onCompositionStart,
  onCompositionEnd,
  onCutForPlainText,
  onCopyForPlainText,
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
      const paragraph = createParagraphNode();
      const text = createTextNode();
      root.append(paragraph.append(text));
      text.select();
    }
  });
}

function clearEditor(editor: OutlineEditor): void {
  editor.update((view) => {
    const firstChild = view.getRoot().getFirstChild();
    if (isParagraphNode(firstChild)) {
      firstChild.clear();
      const textNode = createTextNode();
      firstChild.append(textNode);
      textNode.select();
    }
  });
}

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDownForPlainText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCutForPlainText],
  ['copy', onCopyForPlainText],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForPlainText],
  ['input', onInput],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onBeforeInputForPlainText]);
} else {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlinePlainText(
  editor: OutlineEditor,
  isReadOnly?: boolean = false,
): () => void {
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
    const removeElementListner = editor.addListener('root', (rootElement) => {
      if (rootElement !== null) {
        initEditor(editor);
        editor.registerNodeType('paragraph', ParagraphNode);
      }
    });
    const observer = new MutationObserver(
      (mutations: Array<MutationRecord>) => {
        onMutation(editor, mutations, observer);
      },
    );
    const removeMutationListener = editor.addListener(
      'mutation',
      (rootElement: null | HTMLElement) => {
        if (rootElement === null) {
          observer.disconnect();
        } else {
          observer.observe(rootElement, {
            childList: true,
            subtree: true,
            characterData: true,
          });
        }
      },
    );

    return () => {
      removeMutationListener();
      removeElementListner();
    };
  }, [editor]);

  useOutlineEditorEvents(events, editor, eventHandlerState);
  useOutlineDragonSupport(editor);
  const clearHistory = useOutlineHistory(editor);

  return useCallback(() => {
    clearEditor(editor);
    clearHistory();
  }, [clearHistory, editor]);
}
