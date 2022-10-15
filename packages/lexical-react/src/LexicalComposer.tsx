/* eslint-disable header/header */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {
  FullLexicalMultiEditorStore,
  useLexicalMultiEditorStore,
} from '@lexical/react/LexicalMultiEditorStoreCtx';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  createEditor,
  EditorState,
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {useMemo} from 'react';
import * as React from 'react';
import invariant from 'shared/invariant';
import useLayoutEffect from 'shared/useLayoutEffect';

const HISTORY_MERGE_OPTIONS = {tag: 'history-merge'};

export type InitialEditorStateType =
  | null
  | string
  | EditorState
  | ((editor: LexicalEditor) => void);

type Props = {
  children: JSX.Element | string | (JSX.Element | string)[];
  initialConfig: Readonly<{
    editor__DEPRECATED?: LexicalEditor | null;
    namespace: string;
    nodes?: ReadonlyArray<Klass<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    editable?: boolean;
    theme?: EditorThemeClasses;
    editorState?: InitialEditorStateType;
    multiEditorStoreKey?: string;
  }>;
};

export function LexicalComposer({initialConfig, children}: Props): JSX.Element {
  const multiEditorStoreKey = initialConfig.multiEditorStoreKey;
  const multiEditorStore = useLexicalMultiEditorStore();

  if (Object.keys(multiEditorStore).length === 0) {
    invariant(
      false,
      'LexicalComposer: No active multi-editor store. Add one or remove your multiEditorStoreKey.',
    );
  }

  const isActiveStore =
    ((store): store is FullLexicalMultiEditorStore => {
      return Object.keys(store).length > 0;
    })(multiEditorStore) && typeof multiEditorStoreKey !== 'undefined';
  const isRemountableEditor =
    isActiveStore &&
    typeof multiEditorStore.getEditor(initialConfig.multiEditorStoreKey) !==
      'undefined';

  const composerContext: [LexicalEditor, LexicalComposerContextType] = useMemo(
    () => {
      const {
        theme,
        namespace,
        editor__DEPRECATED: initialEditor,
        nodes,
        onError,
        editorState: initialEditorState,
      } = initialConfig;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        null,
        theme,
        multiEditorStoreKey,
      );
      let editor =
        multiEditorStore.getEditor(multiEditorStoreKey) ||
        initialEditor ||
        null;

      if (editor === null) {
        const newEditor = createEditor({
          editable: false,
          namespace,
          nodes,
          onError: (error) => onError(error, newEditor),
          theme,
        });
        initializeEditor(newEditor, initialEditorState);

        editor = newEditor;
      }

      if (isActiveStore && !isRemountableEditor) {
        multiEditorStore.addEditor(multiEditorStoreKey, editor);
      }

      return [editor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useLayoutEffect(() => {
    if (isRemountableEditor) return; // all set...

    const isEditable = initialConfig.editable;
    const [editor] = composerContext;
    editor.setEditable(isEditable !== undefined ? isEditable : true);

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {children}
    </LexicalComposerContext.Provider>
  );
}

function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  if (initialEditorState === null) {
    return;
  } else if (initialEditorState === undefined) {
    editor.update(() => {
      const root = $getRoot();
      if (root.isEmpty()) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const activeElement = document.activeElement;
        if (
          $getSelection() !== null ||
          (activeElement !== null && activeElement === editor.getRootElement())
        ) {
          paragraph.select();
        }
      }
    }, HISTORY_MERGE_OPTIONS);
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState, HISTORY_MERGE_OPTIONS);
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState, HISTORY_MERGE_OPTIONS);
        break;
      }
      case 'function': {
        editor.update(() => {
          const root = $getRoot();
          if (root.isEmpty()) {
            initialEditorState(editor);
          }
        }, HISTORY_MERGE_OPTIONS);
        break;
      }
    }
  }
}
