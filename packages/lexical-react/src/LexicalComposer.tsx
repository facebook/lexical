/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {JSX} from 'react';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  createEditor,
  EditorState,
  EditorThemeClasses,
  HISTORY_MERGE_TAG,
  HTMLConfig,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from 'lexical';
import * as React from 'react';
import {useMemo} from 'react';
import {CAN_USE_DOM} from 'shared/canUseDOM';
import useLayoutEffect from 'shared/useLayoutEffect';

const HISTORY_MERGE_OPTIONS = {tag: HISTORY_MERGE_TAG};

/**
 * The initial editor state accepted by {@link LexicalComposer} via
 * `initialConfig.editorState`. Each variant is handled differently:
 *
 * - `null` — skip default initialization entirely. The root is left with no
 *   children for an external owner (typically the
 *   [collaboration plugin](/docs/collaboration/react) and its Yjs document)
 *   to populate.
 * - `string` — a JSON string produced by serializing an `EditorState`. Parsed
 *   with {@link LexicalEditor.parseEditorState} and applied via
 *   {@link LexicalEditor.setEditorState}.
 * - `EditorState` — applied directly via {@link LexicalEditor.setEditorState}.
 * - `(editor) => void` — an updater run inside `editor.update(...)`. Invoked
 *   only when the root is still empty, so it will not overwrite content
 *   bootstrapped by another mechanism, and is silently skipped if the root
 *   already has children.
 *
 * Note that `string` and `EditorState` inputs go through `setEditorState`,
 * which throws when the parsed state satisfies `EditorState.isEmpty()` (root
 * with no children and no selection). The empty serialization produced by
 * initializing with `null` and never modifying the editor falls into this
 * category, so it cannot be re-applied via `setEditorState` after a round-trip.
 */
export type InitialEditorStateType =
  | null
  | string
  | EditorState
  | ((editor: LexicalEditor) => void);

export type InitialConfigType = Readonly<{
  namespace: string;
  nodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  onError: (error: Error, editor: LexicalEditor) => void;
  editable?: boolean;
  theme?: EditorThemeClasses;
  /**
   * The initial state of the editor. Read once on mount; changes after the
   * first render are ignored.
   *
   * Omitting the field (or passing `undefined`) seeds the root with a default
   * empty `ParagraphNode`. Pass `null` to skip that default — required when
   * pairing with the collaboration plugin so that the Yjs document, not
   * Lexical, owns the initial content. See {@link InitialEditorStateType}
   * for the full set of accepted shapes.
   */
  editorState?: InitialEditorStateType;
  html?: HTMLConfig;
}>;

type Props = React.PropsWithChildren<{
  initialConfig: InitialConfigType;
}>;

export function LexicalComposer({initialConfig, children}: Props): JSX.Element {
  const composerContext: [LexicalEditor, LexicalComposerContextType] = useMemo(
    () => {
      const {
        theme,
        namespace,
        nodes,
        onError,
        editorState: initialEditorState,
        html,
      } = initialConfig;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        null,
        theme,
      );

      const editor = createEditor({
        editable: initialConfig.editable,
        html,
        namespace,
        nodes,
        onError: error => onError(error, editor),
        theme,
      });
      initializeEditor(editor, initialEditorState);

      return [editor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useLayoutEffect(() => {
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
        const activeElement = CAN_USE_DOM ? document.activeElement : null;
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
