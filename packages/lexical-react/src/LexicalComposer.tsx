/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalComposerContextType} from '@lexical/react/LexicalComposerContext';
import type {EditorThemeClasses, LexicalEditor, LexicalNode} from 'lexical';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {createEditor} from 'lexical';
import {useMemo} from 'react';
import * as React from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';
import {Class} from 'utility-types';

type Props = {
  children: JSX.Element | string | (JSX.Element | string)[];
  initialConfig: Readonly<{
    editor__DEPRECATED?: LexicalEditor | null;
    nodes?: ReadonlyArray<Class<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    readOnly?: boolean;
    theme?: EditorThemeClasses;
  }>;
};

export function LexicalComposer({initialConfig, children}: Props): JSX.Element {
  const composerContext: [LexicalEditor, LexicalComposerContextType] = useMemo(
    () => {
      const {
        theme,
        editor__DEPRECATED: initialEditor,
        nodes,
        onError,
      } = initialConfig;

      const context: LexicalComposerContextType = createLexicalComposerContext(
        null,
        theme,
      );

      let editor = initialEditor || null;

      if (editor === null) {
        const newEditor = createEditor({
          nodes,
          onError: (error) => onError(error, newEditor),
          readOnly: true,
          theme,
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
