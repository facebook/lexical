/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorThemeClasses} from 'outline';
import invariant from 'shared/invariant';
import {createContext as createReactContext, useContext} from 'react';

export type OutlineComposerContextType = {
  getTheme: () => ?EditorThemeClasses,
};

export type OutlineComposerContextWithEditor = [
  OutlineEditor,
  OutlineComposerContextType,
];

export const OutlineComposerContext: React$Context<?OutlineComposerContextWithEditor> =
  createReactContext<?OutlineComposerContextWithEditor>(null);

export function createOutlineComposerContext(
  parent: ?OutlineComposerContextWithEditor,
  theme: ?EditorThemeClasses,
): OutlineComposerContextType {
  let parentContext = null;
  if (parent != null) {
    parentContext = parent[1];
  }

  function getTheme() {
    if (theme != null) {
      return theme;
    }

    return parentContext != null ? parentContext.getTheme() : null;
  }

  return {
    getTheme,
  };
}

export function useOutlineComposerContext(): OutlineComposerContextWithEditor {
  const composerContext = useContext(OutlineComposerContext);

  if (composerContext == null) {
    invariant(
      false,
      'OutlineComposerContext.useOutlineComposerContext: cannot find a OutlineComposerContext',
    );
  }
  return composerContext;
}
