/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, EditorThemeClasses} from 'lexical';

export default function LexicalNestedComposer(arg0: {
  initialEditor: LexicalEditor;
  initialTheme?: EditorThemeClasses;
  children: JSX.Element | (JSX.Element | string | null)[] | null;
}): JSX.Element | null;
