/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {DecoratorEditor, EditorThemeClasses} from 'lexical';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import {createEditor} from 'lexical';
import * as React from 'react';
import {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import invariant from 'shared/invariant';

export default function LexicalNestedComposer({
  initialConfig = {},
  children,
}: {
  children: React$Node,
  initialConfig: $ReadOnly<{
    decoratorEditor: DecoratorEditor,
    theme?: EditorThemeClasses,
  }>,
}): React$Node {
  const parentContext = useContext(LexicalComposerContext);
  if (parentContext == null) {
    invariant(false, 'Unexpected parent context null on a nested composer');
  }
  const [nestedEditor, setNestedEditor] = useState(null);
  const {decoratorEditor} = initialConfig;

  useEffect(() => {
    if (!decoratorEditor.isEmpty() && nestedEditor !== null) {
      decoratorEditor.init(nestedEditor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nestedEditor]);

  const composerContext = useMemo(
    () => {
      const [parentEditor, parentContextContext] = parentContext;
      const composerTheme: void | EditorThemeClasses =
        initialConfig.theme || parentContextContext.getTheme() || undefined;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );
      const editor = createEditor<LexicalComposerContextType>({
        context,
        namespace: parentEditor._config.namespace,
        nodes: Array.from(parentEditor._nodes.values()).map(
          (registeredNode) => registeredNode.klass,
        ),
        onError: parentEditor._onError,
        parentEditor,
        theme: composerTheme,
      });

      return [editor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onChange = useCallback(
    (editorState, nextNestedEditor) => {
      if (!editorState.isEmpty()) {
        decoratorEditor.set(nextNestedEditor);
      } else {
        setNestedEditor(nextNestedEditor);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      <LexicalOnChangePlugin onChange={onChange} />
      {children}
    </LexicalComposerContext.Provider>
  );
}
