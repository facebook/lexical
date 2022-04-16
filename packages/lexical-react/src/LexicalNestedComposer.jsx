/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {EditorThemeClasses, LexicalEditor} from 'lexical';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationPlugin';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {useContext, useMemo} from 'react';
import invariant from 'shared/invariant';

export default function LexicalNestedComposer({
  initialEditor,
  children,
  initialTheme,
}: {
  children: React$Node,
  initialEditor: LexicalEditor,
  initialTheme?: EditorThemeClasses,
}): React$Node {
  const parentContext = useContext(LexicalComposerContext);
  if (parentContext == null) {
    invariant(false, 'Unexpected parent context null on a nested composer');
  }
  const composerContext = useMemo(
    () => {
      const [parentEditor, parentContextContext] = parentContext;
      const composerTheme: void | EditorThemeClasses =
        initialTheme || parentContextContext.getTheme() || undefined;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );
      if (composerTheme !== undefined) {
        initialEditor._config.theme = composerTheme;
      }
      initialEditor._parentEditor = parentEditor;
      initialEditor._nodes = parentEditor._nodes;
      return [initialEditor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  // If collaboration is enabled, make sure we don't render the children
  // until the collaboration subdocument is ready.
  const {yjsDocMap} = useCollaborationContext();
  const isCollab = yjsDocMap.get('main') !== undefined;
  const isCollabReady = yjsDocMap.has(initialEditor.getKey());

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {!isCollab || isCollabReady ? children : null}
    </LexicalComposerContext.Provider>
  );
}
