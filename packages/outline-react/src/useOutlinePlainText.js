/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, State, RootNode} from 'outline';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {useCallback} from 'react';
import {log} from 'outline';
import useLayoutEffect from './shared/useLayoutEffect';
import useOutlineEditorEvents from './useOutlineEditorEvents';
import {createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
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
  onTextMutation,
  onInput,
  onClick,
} from 'outline/events';
import useOutlineDragonSupport from './shared/useOutlineDragonSupport';
import useOutlineHistory from './shared/useOutlineHistory';

function shouldSelectParagraph(state: State, editor: OutlineEditor): boolean {
  const activeElement = document.activeElement;
  return (
    state.getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(
  state: State,
  root: RootNode,
  editor: OutlineEditor,
): void {
  const paragraph = createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(state, editor)) {
    paragraph.select();
  }
}

function initEditor(editor: OutlineEditor): void {
  editor.update((state) => {
    log('initEditor');
    const root = state.getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild === null) {
      initParagraph(state, root, editor);
    }
  });
}

function clearEditor(
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update((state) => {
    log('clearEditor');
    const root = state.getRoot();
    root.clear();
    initParagraph(state, root, editor);
  }, callbackFn);
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
  ['click', onClick],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onBeforeInputForPlainText]);
} else {
  events.push(['drop', onDropPolyfill]);
}

export default function useOutlinePlainText(editor: OutlineEditor): () => void {
  useLayoutEffect(() => {
    editor.registerNodeType('paragraph', ParagraphNode);
    initEditor(editor);

    return editor.addListener('textmutation', onTextMutation);
  }, [editor]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);
  const clearHistory = useOutlineHistory(editor);

  return useCallback(
    (callbackFn?: () => void) => {
      clearEditor(editor, () => {
        clearHistory();
        if (callbackFn) {
          callbackFn();
        }
      });
    },
    [clearHistory, editor],
  );
}
