/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineEditor,
  RootNode,
  Command,
  CommandListenerEditorPriority,
  TextFormatType,
} from 'outline';
import type {InputEvents} from 'outline-react/useOutlineEditorEvents';

import {log, getSelection, getRoot} from 'outline';
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
import useLayoutEffect from 'shared/useLayoutEffect';

const EditorPriority: CommandListenerEditorPriority = 0;

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
    const teardown = [
      editor.registerNodes([
        HeadingNode,
        ListNode,
        QuoteNode,
        CodeNode,
        ParagraphNode,
        ListItemNode,
      ]),
      editor.addListener('textmutation', onTextMutation),
      editor.addListener(
        'command',
        (command: Command): boolean => {
          const selection = getSelection();
          if (selection === null) {
            return false;
          }
          switch (command.type) {
            case 'deleteCharacter': {
              const isBackward: boolean = command.payload;
              selection.deleteCharacter(isBackward);
              return true;
            }
            case 'deleteWord': {
              const isBackward: boolean = command.payload;
              selection.deleteWord(isBackward);
              return true;
            }
            case 'deleteLine': {
              const isBackward: boolean = command.payload;
              selection.deleteLine(isBackward);
              return true;
            }
            case 'insertText':
              const text: string = command.payload;
              selection.insertText(text);
              return true;
            case 'removeText':
              selection.removeText();
              return true;
            case 'formatText':
              const format: TextFormatType = command.payload;
              selection.formatText(format);
              return true;
            case 'insertLineBreak':
              const selectStart: boolean = command.payload;
              selection.insertLineBreak(selectStart);
              return true;
            case 'insertParagraph':
              selection.insertParagraph();
              return true;
          }
          return false;
        },
        EditorPriority,
      ),
    ];
    if (init) {
      initEditor(editor);
    }
    return () => {
      teardown.forEach((t) => t());
    };
  }, [editor, init]);

  useOutlineEditorEvents(events, editor);
  useOutlineDragonSupport(editor);

  return clearEditor;
}
