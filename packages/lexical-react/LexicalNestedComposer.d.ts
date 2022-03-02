/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class} from 'utility-types';
import type {DecoratorEditor, EditorThemeClasses, LexicalNode} from 'lexical';
export default function LexicalNestedComposer(arg0: {
  initialConfig?: {
    namespace?: string;
    decoratorEditor: DecoratorEditor;
    nodes?: Array<Class<LexicalNode>>;
    theme?: EditorThemeClasses;
    onError?: (arg0: Error) => void;
  };
  children: React.ReactNode;
}): React.ReactNode;
