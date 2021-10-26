/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, View, RootNode} from 'outline';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {useCallback} from 'react';
import useLayoutEffect from './shared/useLayoutEffect';
import useOutlineEditorEvents from './useOutlineEditorEvents';
import {
  createParagraphNode,
  ParagraphNode,
} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT, IS_SAFARI, IS_CHROME} from 'shared/environment';
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
  applyMutationInputWebkitWorkaround,
  onClick,
} from 'outline/EventHelpers';
import useOutlineDragonSupport from './shared/useOutlineDragonSupport';
import useOutlineHistory from './shared/useOutlineHistory';

function initParagraph(view: View, root: RootNode): void {
  const paragraph = createParagraphNode();
  root.append(paragraph);
  if (view.getSelection() !== null) {
    paragraph.select();
  }
}

function initEditor(editor: OutlineEditor): void {
  editor.update((view) => {
    view.log('initEditor')
    const root = view.getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild === null) {
      initParagraph(view, root);
    }
  });
}

function clearEditor(
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(
    (view) => {
      view.log('clearEditor')
      const root = view.getRoot();
      root.clear();
      initParagraph(view, root);
    },
    callbackFn,
  );
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

if (IS_SAFARI || IS_CHROME) {
  applyMutationInputWebkitWorkaround();
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
