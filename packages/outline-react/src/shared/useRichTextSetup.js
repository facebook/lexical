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

import {log, getSelection, getRoot} from 'outline';
import useLayoutEffect from 'shared/useLayoutEffect';
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
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onCutForRichText,
  onCopyForRichText,
  onBeforeInput,
  onPasteForRichText,
  onDropPolyfill,
  onDragStartPolyfill,
  onTextMutation,
  onInput,
  onClick,
} from 'outline/events';
import {
  deleteCharacter,
  formatText,
  insertText,
  insertLineBreak,
  insertParagraph,
} from 'outline/selection';

const events: InputEvents = [
  ['selectionchange', onSelectionChange],
  ['keydown', onKeyDown],
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
  events.push(['beforeinput', onBeforeInput]);
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

export function initEditor(editor: OutlineEditor): void {
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
  editor.update(
    () => {
      log('clearEditor');
      const root = getRoot();
      root.clear();
      initParagraph(root, editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export function useRichTextSetup(
  editor: OutlineEditor,
  init: boolean,
): (
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
) => void {
  useLayoutEffect(() => {
    const destroy = [
      editor.registerNodes([
        HeadingNode,
        ListNode,
        QuoteNode,
        CodeNode,
        ParagraphNode,
        ListItemNode,
      ]),
      editor.addListener('textMutation', onTextMutation),
      editor.addListener('deleteCharacter', (isBackward: boolean) => {
        const selection = getSelection();
        if (selection !== null) {
          deleteCharacter(selection, isBackward);
        }
      }),
      editor.addListener('formatText', (format) => {
        const selection = getSelection();
        if (selection !== null) {
          formatText(selection, format);
        }
      }),
      editor.addListener('insertText', (text: string) => {
        const selection = getSelection();
        if (selection !== null) {
          insertText(selection, text);
        }
      }),
      editor.addListener('insertLineBreak', (openLine?: boolean) => {
        const selection = getSelection();
        if (selection !== null) {
          insertLineBreak(selection, openLine);
        }
      }),
      editor.addListener('insertParagraph', () => {
        const selection = getSelection();
        if (selection !== null) {
          insertParagraph(selection);
        }
      }),
    ];
    if (init) {
      initEditor(editor);
    }
    return () => {
      destroy.forEach((d) => d());
    };
  }, [editor, init]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);

  return clearEditor;
}
