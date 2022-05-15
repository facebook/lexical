import type {HistoryState} from '@lexical/history';
import type {LexicalEditor} from 'lexical';
import {useHistory} from './shared/useHistory';
export {createEmptyHistoryState} from '@lexical/history';
export type {HistoryState};
export function useLexicalHistory(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  delay: number = 1000,
): void {
  return useHistory(editor, externalHistoryState, delay);
}