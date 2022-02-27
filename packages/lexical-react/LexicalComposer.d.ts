/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class} from 'utility-types';
import type {EditorThemeClasses, LexicalEditor, LexicalNode} from 'lexical';
export type LexicalComposerProps = {
  children: React.ReactNode;
  initialConfig?: {
    editor?: LexicalEditor | null;
    isReadOnly?: boolean;
    namespace?: string;
    nodes?: Array<Class<LexicalNode>>;
    onError: (error: Error, editor: LexicalEditor) => void;
    theme?: EditorThemeClasses;
  };
};
export default function LexicalComposer(LexicalComposerProps): React.ReactNode;
