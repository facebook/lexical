/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorState, EditorThemeClasses} from 'outline';

import * as React from 'react';
import {createContext as createReactContext, useContext, useMemo} from 'react';
import {createEditor} from 'outline';
import invariant from 'shared/invariant';

type EditorContextType<Context> = null | [OutlineEditor, Context];

export type EditorContext<Context> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<EditorContextType<Context>>,
};

export type EditorContextConfig = {
  initialEditorState?: EditorState,
  theme?: EditorThemeClasses,
};

export function createEditorContext<Context>(
  createContext: () => Context,
  editorConfig: EditorContextConfig,
): EditorContext<Context> {
  const OutlineEditorContext =
    createReactContext<EditorContextType<Context>>(null);

  function OutlineEditorScope({children}: {children: React$Node}) {
    const editorContext = useMemo(() => {
      const context: Context = createContext();
      const editor = createEditor<Context>({
        ...editorConfig,
        context,
      });

      return [editor, context];
    }, []);

    return (
      <OutlineEditorContext.Provider value={editorContext}>
        {children}
      </OutlineEditorContext.Provider>
    );
  }
  OutlineEditorScope.__context = OutlineEditorContext;

  return OutlineEditorScope;
}

export function useEditorContext<Context>(
  editorContext: EditorContext<Context>,
): [OutlineEditor, Context] {
  const context = useContext(editorContext.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineEditorContext.useEditorContext: cannot find matching OutlineEditorContext',
    );
  }
  return context;
}
