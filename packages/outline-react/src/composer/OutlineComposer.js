/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, EditorThemeClasses} from 'outline';

import {useEditorContext} from '../OutlineEditorContext';
import {createOutlineComposerContext} from './OutlineComposerEditorContext';
import * as OutlineComposerEditorContext from './OutlineComposerEditorContext';
import {useMemo} from 'react';

type Props = {
  theme: ?EditorThemeClasses,
  initialEditorState: ?EditorState,
};

export default function OutlineComposer({
  theme,
  initialEditorState,
}: Props): React.MixedElement {
  const [_editor, parentContext] = useEditorContext(
    OutlineComposerEditorContext,
  );
  const composerEditorContext = useMemo(() =>
    createOutlineComposerContext({theme, initialEditorState}, parentContext),
  );
}
