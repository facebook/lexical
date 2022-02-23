/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalComposerContextType} from './LexicalComposerContext';
import type {
  CommandListenerEditorPriority,
  EditorThemeClasses,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from '@lexical/react/LexicalComposerContext';
import {$getRoot, createEditor} from 'lexical';
import React, {useContext, useMemo} from 'react';

type Props = {
  children: React$Node,
  initialConfig?: {
    editor?: LexicalEditor | null,
    namespace?: string,
    nodes?: Array<Class<LexicalNode>>,
    onError?: (Error) => void,
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
        editor = createEditor<LexicalComposerContextType>({
          context,
          namespace,
          nodes,
          onError,
          parentEditor,
          theme: composerTheme,
        });
      }

      let hasEventListeners = false;
      let hasBootstrapped = false;
      let isReady = false;
      const isReadyListeners = new Set();
      const isReadyFn = () => isReady;
      const onReady = (listener: () => void) => {
        isReadyListeners.add(listener);
        return () => {
          isReadyListeners.delete(listener);
        };
      };
      const triggerListeners = () => {
        if (isReady) {
          isReadyListeners.forEach((listener) => listener());
        }
      };
      const removeEventListener = editor.addListener(
        'command',
        (type) => {
          if (type === 'eventListeners') {
            hasEventListeners = true;
            isReady = hasBootstrapped;
            triggerListeners();
            removeEventListener();
          }
          return false;
        },
        (0: CommandListenerEditorPriority),
      );
      const removeBootstrapListener = editor.addListener(
        'update',
        ({editorState}) => {
          editorState.read(() => {
            const isEmpty = $getRoot().isEmpty();
            if (!isEmpty) {
              hasBootstrapped = true;
              isReady = hasEventListeners;
              triggerListeners();
              removeBootstrapListener();
            }
          });
        },
      );

      return {
        context,
        editor,
        ready: {
          isReady: isReadyFn,
          onReady,
        },
      };
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
