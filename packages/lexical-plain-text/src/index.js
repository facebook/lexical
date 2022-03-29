/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {
  $insertDataTransferForPlainText,
  getHtmlContent,
} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
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
  const removeListener = mergeRegister(
    editor.registerCommand(
      'deleteCharacter',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isBackward: boolean = payload;
        selection.deleteCharacter(isBackward);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'deleteWord',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isBackward: boolean = payload;
        selection.deleteWord(isBackward);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'deleteLine',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const isBackward: boolean = payload;
        selection.deleteLine(isBackward);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertText',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
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
      },
      0,
    ),
    editor.registerCommand(
      'removeText',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.removeText();
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertLineBreak',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const selectStart: boolean = payload;
        selection.insertLineBreak(selectStart);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertParagraph',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        selection.insertLineBreak();
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'indentContent',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'outdentContent',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertHorizontalRule',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertImage',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'insertTable',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'formatElement',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'formatText',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'keyArrowLeft',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: KeyboardEvent = payload;
        const isHoldingShift = event.shiftKey;
        if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, true);
          return true;
        }
        return false;
      },
      0,
    ),
    editor.registerCommand(
      'keyArrowRight',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: KeyboardEvent = payload;
        const isHoldingShift = event.shiftKey;
        if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, false);
          return true;
        }
        return false;
      },
      0,
    ),
    editor.registerCommand(
      'keyBackspace',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: KeyboardEvent = payload;
        event.preventDefault();
        return editor.dispatchCommand('deleteCharacter', true);
      },
      0,
    ),
    editor.registerCommand(
      'keyDelete',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: KeyboardEvent = payload;
        event.preventDefault();
        return editor.dispatchCommand('deleteCharacter', false);
      },
      0,
    ),
    editor.registerCommand(
      'keyEnter',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: KeyboardEvent = payload;
        event.preventDefault();
        return editor.dispatchCommand('insertLineBreak');
      },
      0,
    ),
    editor.registerCommand(
      'copy',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: ClipboardEvent = payload;
        onCopyForPlainText(event, editor);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'cut',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: ClipboardEvent = payload;
        onCutForPlainText(event, editor);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'paste',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const event: ClipboardEvent = payload;
        onPasteForPlainText(event, editor);
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'drop',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        // TODO: Make drag and drop work at some point.
        const event: DragEvent = payload;
        event.preventDefault();
        return true;
      },
      0,
    ),
    editor.registerCommand(
      'dragstart',
      (payload) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        // TODO: Make drag and drop work at some point.
        const event: DragEvent = payload;
        event.preventDefault();
        return true;
      },
      0,
    ),
  );
  initializeEditor(editor, initialEditorState);
  return removeListener;
}
