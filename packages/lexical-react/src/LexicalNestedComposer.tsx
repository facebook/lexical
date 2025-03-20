/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {KlassConstructor, Transform} from 'lexical';
import type {JSX} from 'react';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationContext';
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {
  EditorThemeClasses,
  Klass,
  LexicalEditor,
  LexicalNode,
  LexicalNodeReplacement,
} from 'lexical';
import * as React from 'react';
import {ReactNode, useContext, useEffect, useMemo, useRef} from 'react';
import invariant from 'shared/invariant';
import warnOnlyOnce from 'shared/warnOnlyOnce';

function getTransformSetFromKlass(
  klass: KlassConstructor<typeof LexicalNode>,
): Set<Transform<LexicalNode>> {
  const transform = klass.transform();
  return transform !== null
    ? new Set<Transform<LexicalNode>>([transform])
    : new Set<Transform<LexicalNode>>();
}

export interface LexicalNestedComposerProps {
  /**
   * Any children (e.g. plug-ins) for this editor
   */
  children: ReactNode;
  /**
   * The nested editor, created outside of this component with {@link createEditor}
   */
  initialEditor: LexicalEditor;
  /**
   * Optionally overwrite the theme of the initialEditor
   */
  initialTheme?: EditorThemeClasses;
  /**
   * @deprecated This feature is not safe or correctly implemented and will be removed in v0.30.0. The only correct time to configure the nodes is when creating the initialEditor.
   */
  initialNodes?: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement>;
  /**
   * If this is not explicitly set to true, and the collab plugin is active, rendering the children of this component will not happen until collab is ready.
   */
  skipCollabChecks?: true;
}

const initialNodesWarning = warnOnlyOnce(
  `LexicalNestedComposer initialNodes is deprecated and will be removed in v0.30.0. It does not work correctly. You should configure your editor's nodes with createEditor({nodes})`,
);

export function LexicalNestedComposer({
  initialEditor,
  children,
  initialNodes,
  initialTheme,
  skipCollabChecks,
}: LexicalNestedComposerProps): JSX.Element {
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
            exportDOM: entry.exportDOM,
            klass: entry.klass,
            replace: entry.replace,
            replaceWithKlass: entry.replaceWithKlass,
            transforms: getTransformSetFromKlass(entry.klass),
          });
        }
      } else {
        initialNodesWarning();
        for (let klass of initialNodes) {
          let replace = null;
          let replaceWithKlass = null;

          if (typeof klass !== 'function') {
            const options = klass;
            klass = options.replace;
            replace = options.with;
            replaceWithKlass = options.withKlass || null;
          }
          const registeredKlass = initialEditor._nodes.get(klass.getType());

          initialEditor._nodes.set(klass.getType(), {
            exportDOM: registeredKlass ? registeredKlass.exportDOM : undefined,
            klass,
            replace,
            replaceWithKlass,
            transforms: getTransformSetFromKlass(klass),
          });
        }
      }

      initialEditor._config.namespace = parentEditor._config.namespace;

      initialEditor._editable = parentEditor._editable;

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
