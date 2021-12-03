/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, EditorThemeClasses} from 'outline';

import {
  OutlineComposerContext,
  createOutlineComposerContext,
} from './OutlineComposerContext';
import React, {useContext, useMemo} from 'react';

type Props = {
  children: React$Node,
  theme?: EditorThemeClasses,
  initialEditorState?: EditorState,
};

export default function OutlineComposer({
  children,
  initialEditorState,
  theme,
}: Props): React$MixedElement {
  const parentContext = useContext(OutlineComposerContext);
  const composerEditorContext = useMemo(
    () =>
      createOutlineComposerContext({theme, initialEditorState}, parentContext),
    [theme, initialEditorState, parentContext],
  );

  return (
    <OutlineComposerContext.Provider value={composerEditorContext}>
      {children}
    </OutlineComposerContext.Provider>
  );
}
