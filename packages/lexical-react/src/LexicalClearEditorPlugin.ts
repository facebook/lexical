/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {registerClearEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

import useLayoutEffect from './shared/useLayoutEffect';

type Props = Readonly<{
  onClear?: () => void;
}>;

/**
 * Registers a handler for `CLEAR_EDITOR_COMMAND` that empties the editor and
 * resets the selection. Provide `onClear` to run your own logic in place of the
 * default clearing behavior.
 *
 * This is a legacy plugin. When building an editor with the extension API,
 * configure {@link ClearEditorExtension} instead.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function ClearEditorPlugin({onClear}: Props): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(
    () => registerClearEditor(editor, onClear),
    [editor, onClear],
  );
  return null;
}
