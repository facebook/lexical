/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class} from 'utility-types';
import type {
  DecoratorEditor,
  EditorThemeClasses,
  LexicalNode,
  LexicalEditor,
} from 'lexical';
export type LexicalNestedComposerProps = {
  children?: React.ReactNode;
  initialConfig?: {
    decoratorEditor: DecoratorEditor;
    namespace?: string;
    nodes?: Array<Class<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    theme?: EditorThemeClasses;
  };
};
export default function LexicalNestedComposer(
  LexicalNestedComposerProps,
): React.ReactNode;
