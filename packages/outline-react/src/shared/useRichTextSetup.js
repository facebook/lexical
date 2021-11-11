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

import {log} from 'outline';
import useLayoutEffect from './useLayoutEffect';
import useOutlineEditorEvents from '../useOutlineEditorEvents';
import {HeadingNode} from 'outline/HeadingNode';
import {ListNode} from 'outline/ListNode';
import {QuoteNode} from 'outline/QuoteNode';
import {CodeNode} from 'outline/CodeNode';
import {ParagraphNode} from 'outline/ParagraphNode';
import {ListItemNode} from 'outline/ListItemNode';
import {createParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import useOutlineDragonSupport from './useOutlineDragonSupport';
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
  onClick,
} from 'outline/events';

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

export function initEditor(editor: OutlineEditor): void {
  editor.update((state: State) => {
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

export function useRichTextSetup(
  editor: OutlineEditor,
  init: boolean,
): (
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
) => void {
  useLayoutEffect(() => {
    editor.registerNodeType('heading', HeadingNode);
    editor.registerNodeType('list', ListNode);
    editor.registerNodeType('quote', QuoteNode);
    editor.registerNodeType('code', CodeNode);
    editor.registerNodeType('paragraph', ParagraphNode);
    editor.registerNodeType('listitem', ListItemNode);
    if (init) {
      initEditor(editor);
    }

    return editor.addListener('textmutation', onTextMutation);
  }, [editor, init]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);

  return clearEditor;
}
