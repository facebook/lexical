/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import useBootstrapEditor from './shared/useBootstrapEditor';

export default function LexicalBootstrapPlugin({
  initialPayloadFn,
  clearEditorFn,
}: {
  clearEditorFn?: (LexicalEditor) => void,
  initialPayloadFn?: (LexicalEditor) => void,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  useBootstrapEditor(editor, initialPayloadFn, clearEditorFn);

  return null;
}
