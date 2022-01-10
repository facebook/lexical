/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from './LexicalComposerContext';
import type {EditorThemeClasses, EditorStateRef} from 'lexical';
import {createEditor} from 'lexical';
import {
  LexicalComposerContext,
  createLexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import React, {useContext, useMemo} from 'react';

type Props = {
  children: React$Node,
  theme?: EditorThemeClasses,
  initialEditorStateRef?: EditorStateRef,
};

export default function LexicalComposer({
  children,
  initialEditorStateRef,
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

      const config = {theme: composerTheme || {}, parentEditor};
      const context: LexicalComposerContextType = createLexicalComposerContext(
        parentContext,
        composerTheme,
      );
      let editor =
        initialEditorStateRef !== undefined
          ? initialEditorStateRef._editor
          : null;

      if (editor === null) {
        editor = createEditor<LexicalComposerContextType>({
          ...config,
          context,
        });
      } else {
        editor._config = {
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
