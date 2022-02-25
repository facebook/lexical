import type {LexicalEditor} from 'lexical';

import {
  $insertDataTransferForPlainText,
  $insertDataTransferForRichText,
  getHtmlContent,
  getLexicalContent,
} from '@lexical/clipboard';
import {$getSelection, $isRangeSelection} from 'lexical';

export function onPasteForPlainText(
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

export function onCutForPlainText(
  event: ClipboardEvent,
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

export function onCopyForPlainText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const htmlString = getHtmlContent();
        if (htmlString !== null) {
          clipboardData.setData('text/html', getHtmlContent(editor));
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

export function onCutForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  onCopyForRichText(event, editor);
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      selection.removeText();
    }
  });
}

export function onCopyForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const clipboardData = event.clipboardData;
    const selection = $getSelection();
    if (selection !== null) {
      if (clipboardData != null) {
        const htmlString = getHtmlContent();
        const lexicalString = getLexicalContent();
        if (htmlString !== null) {
          clipboardData.setData('text/html', getHtmlContent(editor));
        }
        if (lexicalString !== null) {
          clipboardData.setData(
            'application/x-lexical-editor',
            getLexicalContent(editor),
          );
        }
        clipboardData.setData('text/plain', selection.getTextContent());
      }
    }
  });
}

export function onPasteForRichText(
  event: ClipboardEvent,
  editor: LexicalEditor,
): void {
  event.preventDefault();
  editor.update(() => {
    const selection = $getSelection();
    const clipboardData = event.clipboardData;
    if (clipboardData != null && $isRangeSelection(selection)) {
      $insertDataTransferForRichText(clipboardData, selection, editor);
    }
  });
}
