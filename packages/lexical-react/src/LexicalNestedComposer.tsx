/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {EditorThemeClasses, Klass, LexicalEditor, LexicalNode} from 'lexical';
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
  const wasCollabPreviouslyReadyRef = useRef(false);
  const parentContext = useContext(LexicalComposerContext);

  if (parentContext == null) {
    invariant(false, 'Unexpected parent context null on a nested composer');
  }

  const [parentEditor, {getTheme: getParentTheme}] = parentContext;

  const composerContext: [LexicalEditor, LexicalComposerContextType] = useMemo(
    () => {
      const composerTheme: EditorThemeClasses | undefined =
        initialTheme || getParentTheme() || undefined;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );

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
            replace: entry.replace,
            transforms: new Set(),
          });
        }
      } else {
        for (const klass of initialNodes) {
          const type = klass.getType();
          initialEditor._nodes.set(type, {
            klass,
            replace: null,
            transforms: new Set(),
          });
        }
      }
      initialEditor._config.namespace = parentEditor._config.namespace;

      return [initialEditor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // If collaboration is enabled, make sure we don't render the children until the collaboration subdocument is ready.
  const {isCollabActive, yjsDocMap} = useCollaborationContext();

  const isCollabReady =
    skipCollabChecks ||
    wasCollabPreviouslyReadyRef.current ||
    yjsDocMap.has(initialEditor.getKey());

  useEffect(() => {
    if (isCollabReady) {
      wasCollabPreviouslyReadyRef.current = true;
    }
  }, [isCollabReady]);

  // Update `isEditable` state of nested editor in response to the same change on parent editor.
  useEffect(() => {
    return parentEditor.registerEditableListener((editable) => {
      initialEditor.setEditable(editable);
    });
  }, [initialEditor, parentEditor]);

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {!isCollabActive || isCollabReady ? children : null}
    </LexicalComposerContext.Provider>
  );
}
