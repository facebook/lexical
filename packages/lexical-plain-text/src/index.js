/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CommandListenerEditorPriority,
  EditorState,
  LexicalEditor,
} from 'lexical';

import {
  $insertDataTransferForPlainText,
  getHtmlContent,
} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';

export type InitialEditorStateType = null | string | EditorState | (() => void);

// Convoluted logic to make this work with Flow. Order matters.
const options = {tag: 'history-merge'};
const setEditorOptions: {
  tag?: string,
} = options;
const updateOptions: {
  onUpdate?: () => void,
  skipTransforms?: true,
  tag?: string,
} = options;

function onCopyForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const htmlString = getHtmlContent(editor);
        if (htmlString !== null) {
          clipboardData.setData('text/html', htmlString);
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

function onPasteForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && $isRangeSelection(selection)) {
      $insertDataTransferForPlainText(clipboardData, selection);
    }
  });
}

function onCutForPlainText(event: ClipboardEvent, editor: LexicalEditor): void {
  onCopyForPlainText(event, editor);
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.removeText();
    }
  });
}

function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  if (initialEditorState === null) {
    return;
  } else if (initialEditorState === undefined) {
    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if (firstChild === null) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const activeElement = document.activeElement;
        if (
          $getSelection() !== null ||
          (activeElement !== null && activeElement === editor.getRootElement())
        ) {
          paragraph.select();
        }
      }
    }, updateOptions);
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState, setEditorOptions);
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState, setEditorOptions);
        break;
      }
      case 'function': {
        editor.update(initialEditorState, updateOptions);
        break;
      }
    }
  }
}

export function registerPlainText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void {
  const removeListener = editor.registerCommandListener(
    (type, payload): boolean => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
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
        case 'insertText': {
          const eventOrText: InputEvent | string = payload;
          if (typeof eventOrText === 'string') {
            selection.insertText(eventOrText);
          } else {
            const dataTransfer = eventOrText.dataTransfer;
            if (dataTransfer != null) {
              $insertDataTransferForPlainText(dataTransfer, selection);
            } else {
              const data = eventOrText.data;
              if (data) {
                selection.insertText(data);
              }
            }
          }
          return true;
        }
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
        case 'indentContent':
        case 'outdentContent':
        case 'insertHorizontalRule':
        case 'insertImage':
        case 'insertTable':
        case 'formatElement':
        case 'formatText': {
          return true;
        }
        case 'keyArrowLeft': {
          const event: KeyboardEvent = payload;
          const isHoldingShift = event.shiftKey;
          if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
            event.preventDefault();
            $moveCharacter(selection, isHoldingShift, true);
            return true;
          }
          return false;
        }
        case 'keyArrowRight': {
          const event: KeyboardEvent = payload;
          const isHoldingShift = event.shiftKey;
          if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
            event.preventDefault();
            $moveCharacter(selection, isHoldingShift, false);
            return true;
          }
          return false;
        }
        case 'keyBackspace': {
          const event: KeyboardEvent = payload;
          event.preventDefault();
          return editor.execCommand('deleteCharacter', true);
        }
        case 'keyDelete': {
          const event: KeyboardEvent = payload;
          event.preventDefault();
          return editor.execCommand('deleteCharacter', false);
        }
        case 'keyEnter': {
          const event: KeyboardEvent = payload;
          event.preventDefault();
          return editor.execCommand('insertLineBreak');
        }
        case 'copy': {
          const event: ClipboardEvent = payload;
          onCopyForPlainText(event, editor);
          return true;
        }
        case 'cut': {
          const event: ClipboardEvent = payload;
          onCutForPlainText(event, editor);
          return true;
        }
        case 'paste': {
          const event: ClipboardEvent = payload;
          onPasteForPlainText(event, editor);
          return true;
        }
        case 'drop':
        case 'dragstart': {
          // TODO: Make drag and drop work at some point.
          const event: DragEvent = payload;
          event.preventDefault();
          return true;
        }
      }
      return false;
    },
    (0: CommandListenerEditorPriority),
  );
  initializeEditor(editor, initialEditorState);
  return removeListener;
}
