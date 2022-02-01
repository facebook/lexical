/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from './LexicalComposerContext';
import type {EditorThemeClasses, LexicalEditor} from 'lexical';
import {createEditor} from 'lexical';
import {
  LexicalComposerContext,
  createLexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import React, {useContext, useMemo} from 'react';

type Props = {
  children: React$Node,
  initialEditor?: LexicalEditor | null,
  namespace?: string,
  theme?: EditorThemeClasses,
};

export default function LexicalComposer({
  namespace,
  children,
  initialEditor,
  theme,
}: Props): React$MixedElement {
  const parentContext = useContext(LexicalComposerContext);
  const composerContext = useMemo(
    () => {
      let composerTheme: void | EditorThemeClasses;
      let parentEditor;

      if (theme != null) {
        composerTheme = theme;
      } else if (parentContext != null) {
        parentEditor = parentContext[0];
        const parentTheme = parentContext[1].getTheme();
        if (parentTheme != null) {
          composerTheme = parentTheme;
        }
      }

      const config = {namespace, parentEditor, theme: composerTheme || {}};
      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );
      let editor = initialEditor || null;

      if (editor === null) {
        editor = createEditor<LexicalComposerContextType>({
          ...config,
          context,
        });
      } else {
        const previousConfig = editor._config;
        // $FlowFixMe: Flow doesn't understand this spread correctly
        editor._config = {
          ...previousConfig,
          ...config,
          context,
        };
      }

      return [editor, context];
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );
  return (
    <LexicalComposerContext.Provider value={composerContext}>
      {children}
    </LexicalComposerContext.Provider>
  );
}
