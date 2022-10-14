/* eslint-disable header/header */

import type {HistoryState} from '@lexical/history';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalMultiEditorContext,
  useLexicalMultiEditorContext,
} from '@lexical/react/LexicalMultiEditorContext';

import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

export function HistoryPlugin({
  externalHistoryState,
}: {
  externalHistoryState?: HistoryState;
}): null {
  const [editor, context] = useLexicalComposerContext();

  const multiEditorKey = context.getMultiEditorKey() || undefined; // parentKey or null
  const multiEditorContext = useLexicalMultiEditorContext();
  const isActiveStore =
    ((storeCtx): storeCtx is LexicalMultiEditorContext => {
      return Object.keys(storeCtx).length > 0;
    })(multiEditorContext) && typeof multiEditorKey === 'string';
  const storeHistory = isActiveStore
    ? multiEditorContext.getEditorHistory(multiEditorKey)
    : undefined;

  if (isActiveStore) {
    if (typeof storeHistory === 'undefined') {
      multiEditorContext.addHistory(multiEditorKey, externalHistoryState);
    }
  }

  useHistory(editor, externalHistoryState ?? storeHistory);

  return null;
}
