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
import {createEditor} from 'lexical';
import {
  LexicalComposerContext,
  createLexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import React, {useContext, useMemo} from 'react';

type Props = {
  initialConfig?: {
    editor?: LexicalEditor | null,
    namespace?: string,
    nodes?: Array<Class<LexicalNode>>,
    theme?: EditorThemeClasses,
    onError?: (Error) => void,
  },
  children: React$Node,
};

function defaultOnError(e: Error): void {
  throw e;
}

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
        editor = createEditor<LexicalComposerContextType>({
          namespace,
          nodes,
          theme: composerTheme,
          parentEditor,
          context,
        });

        editor.addListener('error', onError || defaultOnError);
      }

      return [editor, context];
    },

    // We only do this for init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {children}
    </LexicalComposerContext.Provider>
  );
}
