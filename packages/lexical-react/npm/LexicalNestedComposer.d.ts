/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { EditorThemeClasses, Klass, LexicalEditor, LexicalNode } from 'lexical';
import { ReactNode } from 'react';
export declare function LexicalNestedComposer({ initialEditor, children, initialNodes, initialTheme, skipCollabChecks, }: {
    children: ReactNode;
    initialEditor: LexicalEditor;
    initialTheme?: EditorThemeClasses;
    initialNodes?: ReadonlyArray<Klass<LexicalNode>>;
    skipCollabChecks?: true;
}): JSX.Element;
