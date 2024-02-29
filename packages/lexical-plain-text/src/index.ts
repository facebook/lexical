/** @module @lexical/plain-text */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CommandPayloadType, LexicalEditor} from 'lexical';

import {
  $getHtmlContent,
  $insertDataTransferForPlainText,
} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {mergeRegister, objectKlassEquals} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $selectAll,
  COMMAND_PRIORITY_EDITOR,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  COPY_COMMAND,
  CUT_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DELETE_LINE_COMMAND,
  DELETE_WORD_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  REMOVE_TEXT_COMMAND,
  SELECT_ALL_COMMAND,
} from 'lexical';
import {
  CAN_USE_BEFORE_INPUT,
  IS_APPLE_WEBKIT,
  IS_IOS,
  IS_SAFARI,
} from 'shared/environment';

function onCopyForPlainText(
  event: CommandPayloadType<typeof COPY_COMMAND>,
  editor: LexicalEditor,
): void {
  editor.update(() => {
    if (event !== null) {
      const clipboardData = objectKlassEquals(event, KeyboardEvent)
        ? null
        : (event as ClipboardEvent).clipboardData;
      const selection = $getSelection();

      if (selection !== null && clipboardData != null) {
        event.preventDefault();
        const htmlString = $getHtmlContent(editor);

        if (htmlString !== null) {
          clipboardData.setData('text/html', htmlString);
        }

        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

function onPasteForPlainText(
  event: CommandPayloadType<typeof PASTE_COMMAND>,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(
    () => {
      const selection = $getSelection();
      const {clipboardData} = event as ClipboardEvent;
      if (clipboardData != null && $isRangeSelection(selection)) {
        $insertDataTransferForPlainText(clipboardData, selection);
      }
    },
    {
      tag: 'paste',
    },
  );
}

function onCutForPlainText(
  event: CommandPayloadType<typeof CUT_COMMAND>,
  editor: LexicalEditor,
): void {
  onCopyForPlainText(event, editor);
  editor.update(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      selection.removeText();
    }
  });
}

export function registerPlainText(editor: LexicalEditor): () => void {
  const removeListener = mergeRegister(
    editor.registerCommand<boolean>(
      DELETE_CHARACTER_COMMAND,
      (isBackward) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.deleteCharacter(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      DELETE_WORD_COMMAND,
      (isBackward) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.deleteWord(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      DELETE_LINE_COMMAND,
      (isBackward) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.deleteLine(isBackward);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<InputEvent | string>(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (eventOrText) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

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
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      REMOVE_TEXT_COMMAND,
      () => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.removeText();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<boolean>(
      INSERT_LINE_BREAK_COMMAND,
      (selectStart) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.insertLineBreak(selectStart);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        selection.insertLineBreak();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_LEFT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const event = payload;
        const isHoldingShift = event.shiftKey;

        if ($shouldOverrideDefaultCharacterSelection(selection, true)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, true);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_ARROW_RIGHT_COMMAND,
      (payload) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const event = payload;
        const isHoldingShift = event.shiftKey;

        if ($shouldOverrideDefaultCharacterSelection(selection, false)) {
          event.preventDefault();
          $moveCharacter(selection, isHoldingShift, false);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        event.preventDefault();
        return editor.dispatchCommand(DELETE_CHARACTER_COMMAND, true);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent>(
      KEY_DELETE_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        event.preventDefault();
        return editor.dispatchCommand(DELETE_CHARACTER_COMMAND, false);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<KeyboardEvent | null>(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        if (event !== null) {
          // If we have beforeinput, then we can avoid blocking
          // the default behavior. This ensures that the iOS can
          // intercept that we're actually inserting a paragraph,
          // and autocomplete, autocapitalize etc work as intended.
          // This can also cause a strange performance issue in
          // Safari, where there is a noticeable pause due to
          // preventing the key down of enter.
          if (
            (IS_IOS || IS_SAFARI || IS_APPLE_WEBKIT) &&
            CAN_USE_BEFORE_INPUT
          ) {
            return false;
          }

          event.preventDefault();
        }

        return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false);
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      SELECT_ALL_COMMAND,
      () => {
        $selectAll();

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      COPY_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        onCopyForPlainText(event, editor);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      CUT_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        onCutForPlainText(event, editor);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        onPasteForPlainText(event, editor);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<DragEvent>(
      DROP_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        // TODO: Make drag and drop work at some point.
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
    editor.registerCommand<DragEvent>(
      DRAGSTART_COMMAND,
      (event) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        // TODO: Make drag and drop work at some point.
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
  );
  return removeListener;
}
