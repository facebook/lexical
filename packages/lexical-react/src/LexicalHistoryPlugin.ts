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

  const multiEditorStoreKey = context.getMultiEditorStoreKey() || undefined;
  const multiEditorStore = useLexicalMultiEditorStore();
  const isActiveStore =
    ((store): store is FullLexicalMultiEditorStore => {
      return Object.keys(store).length > 0;
    })(multiEditorStore) && typeof multiEditorStoreKey === 'string';

  const hasHistoryKey = isActiveStore
    ? multiEditorStore.hasHistoryKey(multiEditorStoreKey, editor.getKey())
    : undefined;
  let storedEditorHistory = isActiveStore
    ? multiEditorStore.getEditorHistory(multiEditorStoreKey)
    : undefined;

  if (isActiveStore && !hasHistoryKey) {
    if (typeof storedEditorHistory === 'undefined') {
      // top-level editor (AKA, parent editor)
      storedEditorHistory = multiEditorStore.addOrCreateHistory(
        multiEditorStoreKey,
        editor.getKey(),
        externalHistoryState, // use or create if undefined
      );
    } else {
      // nested editors
      multiEditorStore.addHistoryKey(multiEditorStoreKey, editor.getKey());
    }
  }

  useHistory(editor, externalHistoryState || storedEditorHistory);

  return null;
}
