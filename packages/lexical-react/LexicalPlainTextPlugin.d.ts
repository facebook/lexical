/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState} from 'lexical';
type InitialEditorStateType = null | string | EditorState | (() => void);
export default function PlainTextPlugin(arg0: {
  contentEditable: React.ReactNode;
  initialEditorState?: InitialEditorStateType;
  placeholder: React.ReactNode;
}): React.ReactNode;
