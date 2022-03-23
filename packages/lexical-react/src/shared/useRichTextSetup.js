/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {InitialEditorStateType} from './PlainRichTextUtils';
import type {
  CommandListenerEditorPriority,
  ElementFormatType,
  LexicalEditor,
  TextFormatType,
} from 'lexical';

import {$insertDataTransferForRichText} from '@lexical/clipboard';
import {
  $moveCharacter,
  $shouldOverrideDefaultCharacterSelection,
} from '@lexical/selection';
import {
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
} from 'lexical';
import useLayoutEffect from 'shared/useLayoutEffect';

import {
  onCopyForRichText,
  onCutForRichText,
  onPasteForRichText,
} from './clipboardEvents';
import {initializeEditor} from './PlainRichTextUtils';
import useLexicalDragonSupport from './useLexicalDragonSupport';

export default function useRichTextSetup(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  useLayoutEffect(() => {
    const removeListener = editor.registerListener(
      'command',
      (type, payload): boolean => {
        const selection = $getSelection();
        if (type === 'click' && $isNodeSelection(selection)) {
          selection.clear();
          return true;
        }
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
                $insertDataTransferForRichText(dataTransfer, selection, editor);
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
          case 'formatText': {
            const format: TextFormatType = payload;
            selection.formatText(format);
            return true;
          }
          case 'formatElement': {
            const format: ElementFormatType = payload;
            const node = selection.anchor.getNode();
            const element = $isElementNode(node)
              ? node
              : node.getParentOrThrow();
            element.setFormat(format);
            return true;
          }
          case 'insertLineBreak':
            const selectStart: boolean = payload;
            selection.insertLineBreak(selectStart);
            return true;
          case 'insertParagraph':
            selection.insertParagraph();
            return true;
          case 'indentContent': {
            // Handle code blocks
            const anchor = selection.anchor;
            const parentBlock =
              anchor.type === 'element'
                ? anchor.getNode()
                : anchor.getNode().getParentOrThrow();
            if (parentBlock.canInsertTab()) {
              editor.execCommand('insertText', '\t');
            } else {
              if (parentBlock.getIndent() !== 10) {
                parentBlock.setIndent(parentBlock.getIndent() + 1);
              }
            }
            return true;
          }
          case 'outdentContent': {
            // Handle code blocks
            const anchor = selection.anchor;
            const anchorNode = anchor.getNode();
            const parentBlock =
              anchor.type === 'element'
                ? anchor.getNode()
                : anchor.getNode().getParentOrThrow();
            if (parentBlock.canInsertTab()) {
              const textContent = anchorNode.getTextContent();
              const character = textContent[anchor.offset - 1];
              if (character === '\t') {
                editor.execCommand('deleteCharacter', true);
              }
            } else {
              if (parentBlock.getIndent() !== 0) {
                parentBlock.setIndent(parentBlock.getIndent() - 1);
              }
            }
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
            const {anchor} = selection;
            if (selection.isCollapsed() && anchor.offset === 0) {
              const element =
                anchor.type === 'element'
                  ? anchor.getNode()
                  : anchor.getNode().getParentOrThrow();
              if (element.getIndent() > 0) {
                return editor.execCommand('outdentContent');
              }
            }
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
            if (event.shiftKey) {
              return editor.execCommand('insertLineBreak');
            }
            return editor.execCommand('insertParagraph');
          }
          case 'keyTab': {
            const event: KeyboardEvent = payload;
            event.preventDefault();
            return editor.execCommand(
              event.shiftKey ? 'outdentContent' : 'indentContent',
            );
          }
          case 'keyEscape': {
            editor.blur();
            return true;
          }
          case 'copy': {
            const event: ClipboardEvent = payload;
            onCopyForRichText(event, editor);
            return true;
          }
          case 'cut': {
            const event: ClipboardEvent = payload;
            onCutForRichText(event, editor);
            return true;
          }
          case 'paste': {
            const event: ClipboardEvent = payload;
            onPasteForRichText(event, editor);
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
    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useLexicalDragonSupport(editor);
}
