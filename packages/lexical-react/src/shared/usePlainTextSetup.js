/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  RootNode,
  CommandListenerEditorPriority,
} from 'lexical';

import {$log, $getRoot, $getSelection} from 'lexical';
import {$createParagraphNode, ParagraphNode} from 'lexical/ParagraphNode';
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

function shouldSelectParagraph(editor: LexicalEditor): boolean {
  const activeElement = document.activeElement;
  return (
    $getSelection() !== null ||
    (activeElement !== null && activeElement === editor.getRootElement())
  );
}

function initParagraph(root: RootNode, editor: LexicalEditor): void {
  const paragraph = $createParagraphNode();
  root.append(paragraph);
  if (shouldSelectParagraph(editor)) {
    paragraph.select();
  }
}

function initEditor(editor: LexicalEditor): void {
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
  editor: LexicalEditor,
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
  editor: LexicalEditor,
  init: boolean,
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
              clearEditor(editor);
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

    if (init) {
      initEditor(editor);
    }

    return removeSubscriptions;
  }, [editor, init]);

  useLexicalDragonSupport(editor);
}
