import type {HistoryState} from './DEPRECATED_useLexicalHistory';
import type {EditorState, LexicalEditor} from 'lexical';
import {useLexicalHistory} from './DEPRECATED_useLexicalHistory';
import {usePlainTextSetup} from './shared/usePlainTextSetup';

export function useLexicalPlainText(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  initialEditorState?: null | string | EditorState | (() => void),
): void {
  usePlainTextSetup(editor, initialEditorState);
  useLexicalHistory(editor, externalHistoryState);
}