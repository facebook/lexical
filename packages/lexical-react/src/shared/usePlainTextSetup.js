/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, CommandListenerEditorPriority} from 'lexical';

import {$log, $getSelection} from 'lexical';
import {ParagraphNode} from 'lexical/ParagraphNode';
import useLexicalDragonSupport from './useLexicalDragonSupport';
import {
  onCutForPlainText,
  onCopyForPlainText,
  onPasteForPlainText,
  $shouldOverrideDefaultCharacterSelection,
  $insertDataTransferForPlainText,
} from '@lexical/helpers/events';
import {$moveCharacter} from '@lexical/helpers/selection';
import useLayoutEffect from 'shared/useLayoutEffect';
import withSubscriptions from '@lexical/react/withSubscriptions';

const EditorPriority: CommandListenerEditorPriority = 0;

function initEditor(
  editor: LexicalEditor,
  initialPayloadFn: (LexicalEditor) => void,
): void {
  editor.update(() => {
    $log('initEditor');
    initialPayloadFn(editor);
  });
}

function clearEditor(
  editor: LexicalEditor,
  clearEditorFn: (LexicalEditor) => void,
  callbackFn?: (callbackFn?: () => void) => void,
): void {
  editor.update(
    () => {
      $log('clearEditor');
      clearEditorFn(editor);
    },
    {
      onUpdate: callbackFn,
    },
  );
}

export default function usePlainTextSetup(
  editor: LexicalEditor,
  initialPayloadFn?: (LexicalEditor) => void,
  clearEditorFn?: (LexicalEditor) => void,
): void {
  useLayoutEffect(() => {
    const removeSubscriptions = withSubscriptions(
      editor.registerNodes([ParagraphNode]),
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
            case 'clearEditor': {
              if (clearEditorFn != null) {
                clearEditor(editor, clearEditorFn);
              }
              return false;
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
        EditorPriority,
      ),
    );

    if (initialPayloadFn != null) {
      initEditor(editor, initialPayloadFn);
    }

    return removeSubscriptions;
  }, [clearEditorFn, editor, initialPayloadFn]);

  useLexicalDragonSupport(editor);
}
