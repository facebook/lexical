/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorThemeClasses} from 'outline';
import type {
  EditorContext,
  EditorContextConfig,
} from 'outline-react/OutlineEditorContext';
import invariant from 'shared/invariant';
import {useEditorContext} from '../OutlineEditorContext';
import {createEditorContext} from 'outline-react/OutlineEditorContext';
import {createContext as createReactContext, useContext} from 'react';

export type OutlineComposerEditorContextType = {
  getTheme: () => ?EditorThemeClasses,
};

export type OutlineComposerEditorContext =
  EditorContext<OutlineComposerEditorContextType>;

export const OutlineComposerContext: React$Context<?OutlineComposerEditorContext> =
  createReactContext<?OutlineComposerEditorContext>(null);

function createContext(
  parent: ?OutlineComposerEditorContext,
  theme?: EditorThemeClasses,
): OutlineComposerEditorContextType {
  // eslint-disable-next-line no-unused-vars
  const [parentEditor, parentContext] = parent ?? [];
  return {
    getTheme: () => theme ?? parentContext?.getTheme(),
  };
}

export function createOutlineComposerContext(
  editorConfig: EditorContextConfig,
  parent: ?OutlineComposerEditorContext,
): OutlineComposerEditorContext {
  return createEditorContext<OutlineComposerEditorContextType>(
    () => createContext(parent, editorConfig.theme),
    editorConfig,
  );
}

export function useOutlineComposerContext(): [
  OutlineEditor,
  OutlineComposerEditorContextType,
] {
  const composerContext = useContext(OutlineComposerContext);

  if (composerContext == null) {
    invariant(
      false,
      'OutlineComposerContext.useOutlineComposerContext: cannot find a OutlineComposerContext',
    );
  }
  return useEditorContext(composerContext);
}
