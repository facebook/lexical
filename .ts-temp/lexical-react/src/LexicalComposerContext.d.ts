/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { EditorThemeClasses, LexicalEditor } from 'lexical';
export declare type LexicalComposerContextType = {
    getTheme: () => EditorThemeClasses | null | undefined;
};
export declare type LexicalComposerContextWithEditor = [
    LexicalEditor,
    LexicalComposerContextType
];
export declare const LexicalComposerContext: React.Context<LexicalComposerContextWithEditor | null | undefined>;
export declare function createLexicalComposerContext(parent: LexicalComposerContextWithEditor | null | undefined, theme: EditorThemeClasses | null | undefined): LexicalComposerContextType;
export declare function useLexicalComposerContext(): LexicalComposerContextWithEditor;
