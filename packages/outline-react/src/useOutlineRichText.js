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
  onCutForRichText,
  onCopyForRichText,
  onBeforeInputForRichText,
  onPasteForRichText,
  onDropPolyfill,
  onDragStartPolyfill,
  onInput,
  onMutation,
} from './shared/EventHandlers';
import useOutlineDragonSupport from './shared/useOutlineDragonSupport';
import useOutlineHistory from './shared/useOutlineHistory';

function initEditor(editor: OutlineEditor): void {
  editor.update(
    (view) => {
      const root = view.getRoot();

      if (root.getFirstChild() === null) {
        const paragraph = createParagraphNode();
        const text = createTextNode();
        root.append(paragraph.append(text));
        text.select();
      }
    },
    'initEditor',
  );
}

function clearEditor(editor: OutlineEditor): void {
  editor.update(
    (view) => {
      const root = view.getRoot();
      root.clear();
      initEditor(editor);
    },
    'clearEditor',
  );
}

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDownForRichText],
  ['compositionstart', onCompositionStart],
  ['compositionend', onCompositionEnd],
  ['cut', onCutForRichText],
  ['copy', onCopyForRichText],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForRichText],
  ['input', onInput],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onBeforeInputForRichText]);
} else {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlineRichText(
  editor: OutlineEditor,
  isReadOnly?: boolean = false,
): () => void {
  const eventHandlerState: EventHandlerState = useMemo(
    () => ({
      isReadOnly: false,
      richText: true,
    }),
    [],
  );

  useEffect(() => {
    eventHandlerState.isReadOnly = isReadOnly;
  }, [isReadOnly, eventHandlerState]);

  useEffect(() => {
    const removeElementListner = editor.addListener(
      'root',
      (rootElement: null | HTMLElement) => {
        if (rootElement !== null) {
          editor.registerNodeType('heading', HeadingNode);
          editor.registerNodeType('list', ListNode);
          editor.registerNodeType('quote', QuoteNode);
          editor.registerNodeType('code', CodeNode);
          editor.registerNodeType('paragraph', ParagraphNode);
          editor.registerNodeType('listitem', ListItemNode);
          initEditor(editor);
        }
      },
    );
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
