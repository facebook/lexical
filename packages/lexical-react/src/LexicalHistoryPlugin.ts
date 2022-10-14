/* eslint-disable header/header */

import type {HistoryState} from '@lexical/history';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  FullLexicalMultiEditorStore,
  useLexicalMultiEditorStore,
} from '@lexical/react/LexicalMultiEditorStoreCtx';

import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

export function HistoryPlugin({
  externalHistoryState,
}: {
  externalHistoryState?: HistoryState;
}): null {
  const [editor, context] = useLexicalComposerContext();

  const multiEditorStoreKey = context.getMultiEditorKey() || undefined; // parentKey or null
  const multiEditorStore = useLexicalMultiEditorStore();
  const isActiveStore =
    ((store): store is FullLexicalMultiEditorStore => {
      return Object.keys(store).length > 0;
    })(multiEditorStore) && typeof multiEditorStoreKey === 'string';
  const storeHistory = isActiveStore
    ? multiEditorStore.getEditorHistory(multiEditorStoreKey)
    : undefined;

  if (isActiveStore) {
    if (typeof storeHistory === 'undefined') {
      multiEditorStore.addHistory(multiEditorStoreKey, externalHistoryState);
    }
  }

  useHistory(editor, externalHistoryState ?? storeHistory);

  return null;
}
