/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses} from 'outline';
import type {
  EditorContext,
  EditorContextConfig,
} from 'outline-react/OutlineEditorContext';

import {createEditorContext} from 'outline-react/OutlineEditorContext';

export type OutlineComposerEditorContextType = {
  getTheme: () => ?EditorThemeClasses,
};

export type OutlineComposerEditorContext =
  EditorContext<OutlineComposerEditorContextType>;

function createContext(
  parent: ?OutlineComposerEditorContextType,
  theme?: EditorThemeClasses,
): OutlineComposerEditorContextType {
  return {
    getTheme: () => theme ?? parent?.getTheme(),
  };
}

export function createOutlineComposerContext(
  editorConfig: EditorContextConfig,
  parent: ?OutlineComposerEditorContextType,
): OutlineComposerEditorContext {
  return createEditorContext<OutlineComposerEditorContextType>(
    createContext,
    parent,
    editorConfig,
  );
}
