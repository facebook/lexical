/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DecoratorEditor, EditorThemeClasses} from 'lexical';

export default function LexicalNestedComposer(arg0: {
  initialConfig: {
    decoratorEditor: DecoratorEditor;
    theme?: EditorThemeClasses;
  };
  children: React.ReactNode;
}): React.ReactNode;
