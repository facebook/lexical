/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { EditorThemeClasses, LexicalEditor, LexicalNode } from 'lexical';
import { Class } from 'utility-types';
declare type Props = {
    children: JSX.Element | string | (JSX.Element | string)[];
    initialConfig: Readonly<{
        editor__DEPRECATED?: LexicalEditor | null;
        nodes?: ReadonlyArray<Class<LexicalNode>>;
        onError: (error: Error, editor: LexicalEditor) => void;
        readOnly?: boolean;
        theme?: EditorThemeClasses;
    }>;
};
export declare function LexicalComposer({ initialConfig, children }: Props): JSX.Element;
export {};
