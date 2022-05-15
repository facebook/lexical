import type {HistoryState} from './DEPRECATED_useLexicalHistory';
import type {EditorState, LexicalEditor} from 'lexical';
import {useLexicalHistory} from './DEPRECATED_useLexicalHistory';
import {useRichTextSetup} from './shared/useRichTextSetup';

export function useLexicalRichText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  initialEditorState?: null | string | EditorState | (() => void),
): void {
  useRichTextSetup(editor, initialEditorState);
  useLexicalHistory(editor, externalHistoryState);
}