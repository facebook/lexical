/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorThemeClasses, LexicalEditor} from 'lexical';

import {createContext as createReactContext, useContext} from 'react';
import invariant from 'shared/invariant';

export type LexicalComposerContextType = {
  getTheme: () => ?EditorThemeClasses,
};

export type LexicalComposerContextWithEditor = [
  LexicalEditor,
  LexicalComposerContextType,
];

export const LexicalComposerContext: React$Context<?LexicalComposerContextWithEditor> =
  createReactContext<?LexicalComposerContextWithEditor>(null);

export function createLexicalComposerContext(
  parent: ?LexicalComposerContextWithEditor,
  theme: ?EditorThemeClasses,
): LexicalComposerContextType {
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

export function useLexicalComposerContext(): LexicalComposerContextWithEditor {
  const composerContext = useContext(LexicalComposerContext);

  if (composerContext == null) {
    invariant(
      false,
      'LexicalComposerContext.useLexicalComposerContext: cannot find a LexicalComposerContext',
    );
  }
  return composerContext;
}
