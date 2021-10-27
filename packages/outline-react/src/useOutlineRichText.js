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
import {HeadingNode} from 'outline/HeadingNode';
import {ListNode} from 'outline/ListNode';
import {QuoteNode} from 'outline/QuoteNode';
import {CodeNode} from 'outline/CodeNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {ListItemNode} from 'outline/ListItemNode';
import {createParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT, IS_SAFARI, IS_CHROME} from 'shared/environment';
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
  onTextMutation,
  onInput,
  applyMutationInputWebkitWorkaround,
  onClick,
} from 'outline/events';
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
  editor.update((view: View) => {
    view.log('initEditor');
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
  editor.update((view) => {
    view.log('clearEditor');
    const root = view.getRoot();
    root.clear();
    initParagraph(view, root);
  }, callbackFn);
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
  ['click', onClick],
];

if (CAN_USE_BEFORE_INPUT) {
  events.push(['beforeinput', onBeforeInputForRichText]);
} else {
  events.push(['drop', onDropPolyfill]);
}

if (IS_SAFARI || IS_CHROME) {
  applyMutationInputWebkitWorkaround();
}

export default function useOutlineRichText(editor: OutlineEditor): () => void {
  useLayoutEffect(() => {
    editor.registerNodeType('heading', HeadingNode);
    editor.registerNodeType('list', ListNode);
    editor.registerNodeType('quote', QuoteNode);
    editor.registerNodeType('code', CodeNode);
    editor.registerNodeType('paragraph', ParagraphNode);
    editor.registerNodeType('listitem', ListItemNode);
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
