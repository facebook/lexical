/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Class} from 'utility-types';
import type {EditorThemeClasses, LexicalEditor, LexicalNode} from 'lexical';

type Props = {
  initialConfig: {
    editor__DEPRECATED?: LexicalEditor | null;
    readOnly?: boolean;
    namespace?: string;
    nodes?: Array<Class<LexicalNode>>;
    theme?: EditorThemeClasses;
    onError: (error: Error, editor: LexicalEditor) => void;
  };
  children: JSX.Element | JSX.Element[] | null;
};
export function LexicalComposer(arg0: Props): JSX.Element | null;
