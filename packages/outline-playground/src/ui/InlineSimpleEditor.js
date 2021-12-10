/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, OutlineEditor, EditorStateRef} from 'outline';

import * as React from 'react';

import OnChangePlugin from '../plugins/OnChangePlugin';
import OutlineComposer from 'outline-react/OutlineComposer';

type Props = {
  children?: React$Node,
  onChange?: (editorState: EditorState, editor: OutlineEditor) => void,
  initialEditorStateRef?: EditorStateRef,
};

export default function InlineSimpleEditor({
  children,
  onChange,
  initialEditorStateRef,
}: Props): React$Node {
  return (
    <div className="inline-editor-container">
      <OutlineComposer initialEditorStateRef={initialEditorStateRef}>
        {onChange && <OnChangePlugin onChange={onChange} />}
        {children}
      </OutlineComposer>
    </div>
  );
}
