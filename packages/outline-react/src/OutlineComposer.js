/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineComposerContextType} from './OutlineComposerContext';
import type {EditorState, EditorThemeClasses} from 'outline';
import {createEditor} from 'outline';
import {
  OutlineComposerContext,
  createOutlineComposerContext,
} from 'outline-react/OutlineComposerContext';
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
  const composerContext = useMemo(
    () => {
      const config = {theme, initialEditorState};
      const context: OutlineComposerContextType = createOutlineComposerContext(
        parentContext,
        theme,
      );
      const editor = createEditor<OutlineComposerContextType>({
        ...config,
        context,
      });
      return [editor, context];
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, initialEditorState],
  );
  return (
    <OutlineComposerContext.Provider value={composerContext}>
      {children}
    </OutlineComposerContext.Provider>
  );
}
