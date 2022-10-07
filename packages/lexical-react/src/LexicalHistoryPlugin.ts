/* eslint-disable header/header */

import type {HistoryState} from '@lexical/history';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import {useLexicalMultiEditorProviderContextConfig} from './LexicalMultiEditorContext';
import {useHistory} from './shared/useHistory';

export {createEmptyHistoryState} from '@lexical/history';

export type {HistoryState};

export function HistoryPlugin({
  externalHistoryState,
  initialMultiEditorProviderConfig,
}: {
  externalHistoryState?: HistoryState;
  initialMultiEditorProviderConfig?: Readonly<{
    editorId: string;
  }>;
}): null {
  const [editor] = useLexicalComposerContext();
  const multiEditorProviderContextConfig =
    useLexicalMultiEditorProviderContextConfig(
      initialMultiEditorProviderConfig?.editorId,
      'LexicalHistoryPlugin',
    );

  const externalHistoryStateFromMultiEditorProviderContext =
    multiEditorProviderContextConfig.state !== 'inactive'
      ? multiEditorProviderContextConfig.history
      : undefined;

  useHistory(
    editor,
    externalHistoryStateFromMultiEditorProviderContext || externalHistoryState,
  );

  return null;
}
