/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TOGGLE_LINK_COMMAND} from '@lexical/link';
import {HeadingTagType} from '@lexical/rich-text';
import {
  COMMAND_PRIORITY_NORMAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_MODIFIER_COMMAND,
  LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import {Dispatch, useEffect} from 'react';

import {useToolbarState} from '../../context/ToolbarContext';
import {sanitizeUrl} from '../../utils/url';
import {
  clearFormatting,
  formatBulletList,
  formatCheckList,
  formatCode,
  formatHeading,
  formatNumberedList,
  formatParagraph,
  formatQuote,
  updateFontSize,
  UpdateFontSizeType,
} from '../ToolbarPlugin/utils';
import {
  isCenterAlign,
  isClearFormatting,
  isDecreaseFontSize,
  isFormatBulletList,
  isFormatCheckList,
  isFormatCode,
  isFormatHeading,
  isFormatNumberedList,
  isFormatParagraph,
  isFormatQuote,
  isIncreaseFontSize,
  isIndent,
  isInsertCodeBlock,
  isInsertLink,
  isJustifyAlign,
  isLeftAlign,
  isOutdent,
  isRightAlign,
  isStrikeThrough,
  isSubscript,
  isSuperscript,
} from './shortcuts';

export default function ShortcutsPlugin({
  editor,
  setIsLinkEditMode,
}: {
  editor: LexicalEditor;
  setIsLinkEditMode: Dispatch<boolean>;
}): null {
  const {toolbarState} = useToolbarState();

  useEffect(() => {
    const keyboardShortcutsHandler = (payload: KeyboardEvent) => {
      const event: KeyboardEvent = payload;
      const {key, ctrlKey, altKey, shiftKey, metaKey} = event;

      if (isFormatParagraph(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatParagraph(editor);
      } else if (isFormatHeading(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatHeading(
          editor,
          toolbarState.blockType,
          `h${key}` as HeadingTagType,
        );
      } else if (isFormatBulletList(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatBulletList(editor, toolbarState.blockType);
      } else if (
        isFormatNumberedList(key, ctrlKey, shiftKey, altKey, metaKey)
      ) {
        event.preventDefault();
        formatNumberedList(editor, toolbarState.blockType);
      } else if (isFormatCheckList(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatCheckList(editor, toolbarState.blockType);
      } else if (isFormatCode(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatCode(editor, toolbarState.blockType);
      } else if (isFormatQuote(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        formatQuote(editor, toolbarState.blockType);
      } else if (isStrikeThrough(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
      } else if (isIndent(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
      } else if (isOutdent(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
      } else if (isCenterAlign(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
      } else if (isLeftAlign(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
      } else if (isRightAlign(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
      } else if (isJustifyAlign(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify');
      } else if (isSubscript(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
      } else if (isSuperscript(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
      } else if (isInsertCodeBlock(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
      } else if (isIncreaseFontSize(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        updateFontSize(
          editor,
          UpdateFontSizeType.increment,
          toolbarState.fontSizeInputValue,
        );
      } else if (isDecreaseFontSize(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        updateFontSize(
          editor,
          UpdateFontSizeType.decrement,
          toolbarState.fontSizeInputValue,
        );
      } else if (isClearFormatting(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        clearFormatting(editor);
      } else if (isInsertLink(key, ctrlKey, shiftKey, altKey, metaKey)) {
        event.preventDefault();
        const url = toolbarState.isLink ? null : sanitizeUrl('https://');
        setIsLinkEditMode(!toolbarState.isLink);

        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }

      return false;
    };

    return editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      keyboardShortcutsHandler,
      COMMAND_PRIORITY_NORMAL,
    );
  }, [
    editor,
    toolbarState.isLink,
    toolbarState.blockType,
    toolbarState.fontSizeInputValue,
    setIsLinkEditMode,
  ]);

  return null;
}
