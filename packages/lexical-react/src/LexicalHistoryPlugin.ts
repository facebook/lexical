/* eslint-disable header/header */

import type {HistoryState} from '@lexical/history';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useInternalLexicalMultiEditorContextConfig} from '@lexical/react/LexicalMultiEditorContext';

import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

export function HistoryPlugin({
  externalHistoryState,
}: {
  externalHistoryState?: HistoryState;
}): null {
  const [editor, context] = useLexicalComposerContext();

  const multiEditorKey = context.getMultiEditorKey(); // parentKey or null
  const multiEditorContext =
    useInternalLexicalMultiEditorContextConfig(multiEditorKey);

  if (multiEditorContext.state === 'tracking') {
    if (typeof multiEditorContext.getHistory() === 'undefined') {
      multiEditorContext.startHistory(externalHistoryState);
    }
  }

  const storeHistory =
    multiEditorContext.state === 'tracking'
      ? multiEditorContext?.getHistory()
      : undefined;
  useHistory(editor, externalHistoryState ?? storeHistory);

  return null;
}
