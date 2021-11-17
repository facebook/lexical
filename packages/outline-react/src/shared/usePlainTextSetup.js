/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InputEvents} from 'outline-react/useOutlineEditorEvents';
import type {OutlineEditor, RootNode} from 'outline';

import {log, getRoot, getSelection} from 'outline';
import useLayoutEffect from './useLayoutEffect';
import useOutlineEditorEvents from '../useOutlineEditorEvents';
import {createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import useOutlineDragonSupport from './useOutlineDragonSupport';
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

function shouldSelectParagraph(editor: OutlineEditor): boolean {
  const activeElement = document.activeElement;
  return (
    getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(root: RootNode, editor: OutlineEditor): void {
  const paragraph = createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(editor)) {
    paragraph.select();
  }
}

function initEditor(editor: OutlineEditor): void {
  editor.update(() => {
    log('initEditor');
    const root = getRoot();
    const firstChild = root.getFirstChild();
    if (firstChild === null) {
      initParagraph(root, editor);
    }
  });
}

function clearEditor(
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(() => {
    log('clearEditor');
    const root = getRoot();
    root.clear();
    initParagraph(root, editor);
  }, callbackFn);
}

export default function usePlainTextSetup(
  editor: OutlineEditor,
  init: boolean,
): (
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
) => void {
  useLayoutEffect(() => {
    editor.registerNodeType('paragraph', ParagraphNode);
    if (init) {
      initEditor(editor);
    }
    return editor.addListener('textmutation', onTextMutation);
  }, [editor, init]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);

  return clearEditor;
}
