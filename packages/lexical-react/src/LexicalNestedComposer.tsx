/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {
  LexicalMultiEditorContext,
  useLexicalMultiEditorContext,
} from '@lexical/react/LexicalMultiEditorContext';
import * as React from 'react';
import {ReactNode, useContext, useEffect, useMemo, useRef} from 'react';
import invariant from 'shared/invariant';

export function LexicalNestedComposer({
  initialEditor,
  children,
  initialNodes,
  initialTheme,
  skipCollabChecks,
}: {
  children: ReactNode;
  initialEditor: LexicalEditor;
  initialTheme?: EditorThemeClasses;
  initialNodes?: ReadonlyArray<Klass<LexicalNode>>;
  skipCollabChecks?: true;
}): JSX.Element {
  const parentContext = useContext(LexicalComposerContext);
  const {isCollabActive, yjsDocMap} = useCollaborationContext();
  // TODO review!
  const wasCollabPreviouslyReadyRef = useRef(
    yjsDocMap.has(initialEditor.getKey()) || false,
  );

  if (parentContext == null) {
    invariant(false, 'Unexpected parent context null on a nested composer');
  }

  // only runs on first mount. nested instances live on parent editor, so we can track with a simple string[]

  const multiEditorKey = parentContext[1].getMultiEditorKey() || undefined; // parentKey or null
  const multiEditorContext = useLexicalMultiEditorContext();
  const [isStringKey, isFullStore] = ((keyCtx, storeCtx) => {
    const isKey = (ctx: string | undefined): ctx is string => {
      return typeof ctx === 'string';
    };
    const isStore = (
      ctx: LexicalMultiEditorContext | Record<string, never>,
    ): ctx is LexicalMultiEditorContext => {
      return Object.keys(ctx).length > 0;
    };

    return [isKey, isStore];
  })(multiEditorKey, multiEditorContext);
  const isActiveStore =
    isStringKey(multiEditorKey) && isFullStore(multiEditorContext);

  const composerContext: [LexicalEditor, LexicalComposerContextType] = useMemo(
    () => {
      const [parentEditor, parentContextContext] = parentContext;
      const isAlreadyConfigured = isActiveStore
        ? multiEditorContext.isNestedEditor(
            multiEditorKey,
            initialEditor.getKey(),
          )
        : undefined;
      const composerTheme =
        initialTheme || parentContextContext.getTheme() || undefined;
      const context = createLexicalComposerContext(
        parentContext,
        composerTheme,
        null,
      );

      if (!isAlreadyConfigured) {
        if (composerTheme !== undefined) {
          initialEditor._config.theme = composerTheme;
        }

        initialEditor._parentEditor = parentEditor;

        if (!initialNodes) {
          const parentNodes = (initialEditor._nodes = new Map(
            parentEditor._nodes,
          ));
          for (const [type, entry] of parentNodes) {
            initialEditor._nodes.set(type, {
              klass: entry.klass,
              transforms: new Set(),
            });
          }
        } else {
          for (const klass of initialNodes) {
            const type = klass.getType();
            initialEditor._nodes.set(type, {
              klass,
              transforms: new Set(),
            });
          }
        }

        if (isActiveStore) {
          multiEditorContext.addNestedEditorToList(
            multiEditorKey,
            initialEditor.getKey(),
          );
        }

        initialEditor._config.namespace = parentEditor._config.namespace;
      }

      return [initialEditor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // If collaboration is enabled, make sure we don't render the children
  // until the collaboration subdocument is ready.
  const isCollabReady =
    skipCollabChecks ||
    wasCollabPreviouslyReadyRef.current ||
    yjsDocMap.has(initialEditor.getKey());

  useEffect(() => {
    if (isCollabReady) {
      if (!wasCollabPreviouslyReadyRef.current) {
        wasCollabPreviouslyReadyRef.current = true;
      }
    }
  }, [isCollabReady]);

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {!isCollabActive || isCollabReady ? children : null}
    </LexicalComposerContext.Provider>
  );
}
