/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InputEvents} from 'outline-react/useOutlineEditorEvents';
import type {
  OutlineEditor,
  RootNode,
  CommandListenerEditorPriority,
} from 'outline';

import {$log, $getRoot, $getSelection} from 'outline';
import useOutlineEditorEvents from '../useOutlineEditorEvents';
import {$createParagraphNode, ParagraphNode} from 'outline/ParagraphNode';
import {CAN_USE_BEFORE_INPUT} from 'shared/environment';
import useOutlineDragonSupport from './useOutlineDragonSupport';
import {
  onSelectionChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onCutForPlainText,
  onCopyForPlainText,
  onBeforeInput,
  onPasteForPlainText,
  onDropPolyfill,
  onDragStartPolyfill,
  $onTextMutation,
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
  ['cut', onCutForPlainText],
  ['copy', onCopyForPlainText],
  ['dragstart', onDragStartPolyfill],
  ['paste', onPasteForPlainText],
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
    $getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(root: RootNode, editor: OutlineEditor): void {
  const paragraph = $createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(editor)) {
    paragraph.select();
  }
}

function initEditor(editor: OutlineEditor): void {
  editor.update(() => {
    $log('initEditor');
    const root = $getRoot();
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
      $log('clearEditor');
      const root = $getRoot();
      root.clear();
      initParagraph(root, editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export default function usePlainTextSetup(
  editor: OutlineEditor,
  init: boolean,
): (
  editor: OutlineEditor,
  callbackFn?: (callbackFn?: () => void) => void,
) => void {
  useLayoutEffect(() => {
    const teardown = [
      editor.registerNodes([ParagraphNode]),
      editor.addListener('textmutation', $onTextMutation),
      editor.addListener(
        'command',
        (type, payload): boolean => {
          const selection = $getSelection();
          if (selection === null) {
            return false;
          }
          switch (type) {
            case 'deleteCharacter': {
              const isBackward: boolean = payload;
              selection.deleteCharacter(isBackward);
              return true;
            }
            case 'deleteWord': {
              const isBackward: boolean = payload;
              selection.deleteWord(isBackward);
              return true;
            }
            case 'deleteLine': {
              const isBackward: boolean = payload;
              selection.deleteLine(isBackward);
              return true;
            }
            case 'insertText':
              const text: string = payload;
              selection.insertText(text);
              return true;
            case 'removeText':
              selection.removeText();
              return true;
            case 'insertLineBreak':
              const selectStart: boolean = payload;
              selection.insertLineBreak(selectStart);
              return true;
            case 'insertParagraph':
              selection.insertLineBreak();
              return true;
            case 'insertImage':
            case 'insertTable':
            case 'indentContent':
            case 'outdentContent':
            case 'formatElement':
            case 'formatText': {
              return true;
            }
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
