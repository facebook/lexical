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

type EditorContextType<InitialContext> = null | [OutlineEditor, InitialContext];

export type EditorContext<InitialContext> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<EditorContextType<InitialContext>>,
};

export function createEditorContext<InitialContext>(
  getInitialContext: () => InitialContext,
  editorConfig: {
    initialEditorState?: EditorState,
    theme?: EditorThemeClasses,
  },
): EditorContext<InitialContext> {
  const OutlineEditorContext =
    createReactContext<EditorContextType<InitialContext>>(null);

  function OutlineEditorScope({children}: {children: React$Node}) {
    const editorContext = useMemo(() => {
      const context: InitialContext = getInitialContext();
      const editor = createEditor<InitialContext>({
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

export function useEditorContext<InitialContext>(
  editorContext: EditorContext<InitialContext>,
): [OutlineEditor, InitialContext] {
  const context = useContext(editorContext.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineEditorContext.useEditorContext: cannot find matching OutlineEditorContext',
    );
  }
  return context;
}
