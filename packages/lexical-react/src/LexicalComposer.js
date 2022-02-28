/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from './LexicalComposerContext';
import type {EditorThemeClasses, LexicalEditor, LexicalNode} from 'lexical';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {createEditor} from 'lexical';
import React, {useContext, useMemo} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

type Props = {
  children: React$Node,
  initialConfig?: {
    editor?: LexicalEditor | null,
    namespace?: string,
    nodes?: Array<Class<LexicalNode>>,
    onError: (error: Error, editor: LexicalEditor) => void,
    readOnly?: boolean,
    theme?: EditorThemeClasses,
  },
};

export default function LexicalComposer({
  initialConfig = {},
  children,
}: Props): React$MixedElement {
  const parentContext = useContext(LexicalComposerContext);
  const composerContext = useMemo(
    () => {
      let composerTheme: void | EditorThemeClasses;
      let parentEditor;
      const {
        theme,
        namespace,
        editor: initialEditor,
        nodes,
        onError,
      } = initialConfig;

      if (theme != null) {
        composerTheme = theme;
      } else if (parentContext != null) {
        parentEditor = parentContext[0];
        const parentTheme = parentContext[1].getTheme();
        if (parentTheme != null) {
          composerTheme = parentTheme;
        }
      }

      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );
      let editor = initialEditor || null;

      if (editor === null) {
        const newEditor = createEditor<LexicalComposerContextType>({
          context,
          namespace,
          nodes,
          onError: (error) => onError(error, newEditor),
          parentEditor,
          readOnly: true,
          theme: composerTheme,
        });
        editor = newEditor;
      }

      return [editor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useLayoutEffect(() => {
    const isReadOnly = initialConfig.readOnly;
    const [editor] = composerContext;
    editor.setReadOnly(isReadOnly || false);
    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {children}
    </LexicalComposerContext.Provider>
  );
}
