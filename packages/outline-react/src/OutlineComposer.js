/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineComposerContextType} from './OutlineComposerContext';
import type {EditorThemeClasses, EditorStateRef} from 'outline';
import {createEditor} from 'outline';
import {
  OutlineComposerContext,
  createOutlineComposerContext,
} from 'outline-react/OutlineComposerContext';
import React, {useContext, useMemo} from 'react';

type Props = {
  children: React$Node,
  theme?: EditorThemeClasses,
  initialEditorStateRef?: EditorStateRef,
};

export default function OutlineComposer({
  children,
  initialEditorStateRef,
  theme,
}: Props): React$MixedElement {
  const parentContext = useContext(OutlineComposerContext);
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
      const context: OutlineComposerContextType = createOutlineComposerContext(
        parentContext,
        composerTheme,
      );
      let editor =
        initialEditorStateRef !== undefined
          ? initialEditorStateRef._editor
          : null;

      if (editor === null) {
        editor = createEditor<OutlineComposerContextType>({
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
    <OutlineComposerContext.Provider value={composerContext}>
      {children}
    </OutlineComposerContext.Provider>
  );
}
