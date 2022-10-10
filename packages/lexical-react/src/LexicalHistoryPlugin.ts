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
  const multiEditorContext = useInternalLexicalMultiEditorContextConfig(
    context.multiEditorKey,
  );

  const multiEditorContextHistoryState =
    multiEditorContext.state === 'remountable'
      ? multiEditorContext.history
      : undefined;

  useHistory(editor, multiEditorContextHistoryState || externalHistoryState);

  return null;
}
