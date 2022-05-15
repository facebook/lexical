import type {HistoryState} from '@lexical/history';
import type {LexicalEditor} from 'lexical';
import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {useEffect, useMemo} from 'react';
export function useHistory(
  editor: LexicalEditor,
  externalHistoryState?: HistoryState,
  delay: number = 1000,
): void {
  const historyState: HistoryState = useMemo(
    () => externalHistoryState || createEmptyHistoryState(),
    [externalHistoryState],
  );
  useEffect(() => {
    return registerHistory(editor, historyState, delay);
  }, [delay, editor, historyState]);
}