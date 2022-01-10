/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  LexicalEditor,
  EditorStateRef,
  EditorThemeClasses,
} from 'lexical';

import * as React from 'react';

import OnChangePlugin from '../plugins/OnChangePlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';

type Props = {
  children?: React$Node,
  onChange?: (editorState: EditorState, editor: LexicalEditor) => void,
  initialEditorStateRef?: EditorStateRef,
  theme?: EditorThemeClasses,
};

export default function InlineSimpleEditor({
  children,
  onChange,
  initialEditorStateRef,
  theme,
}: Props): React$Node {
  return (
    <div className="inline-editor-container">
      <LexicalComposer
        initialEditorStateRef={initialEditorStateRef}
        theme={theme}>
        {onChange && <OnChangePlugin onChange={onChange} />}
        {children}
      </LexicalComposer>
    </div>
  );
}
