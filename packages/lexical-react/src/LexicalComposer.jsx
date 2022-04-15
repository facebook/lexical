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
import React, {useMemo} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

type Props = {
  children: React$Node,
  initialConfig: $ReadOnly<{
    editor__DEPRECATED?: LexicalEditor | null,
    namespace?: string,
    nodes?: $ReadOnlyArray<Class<LexicalNode>>,
    onError: (error: Error, editor: LexicalEditor) => void,
    readOnly?: boolean,
    theme?: EditorThemeClasses,
  }>,
};

export default function LexicalComposer({
  initialConfig,
  children,
}: Props): React$MixedElement {
  const composerContext = useMemo(
    () => {
      const {
        theme,
        namespace,
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
          namespace,
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
