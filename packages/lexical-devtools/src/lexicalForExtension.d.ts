/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/**
 * Here we amend original Lexical API in order for the extension JS bundle to correctly work with
 * the Lexical from the page bundle. This solves for the following issues:
 * - Lexical relies on the module variable visibility scope for the "$" prefixed APIs to work correctly.
 *   And obviously code from the extension bundle does not share the same scope as the page.
 * - "instanceof" operator does not work correctly again due to the same issue.
 * So we hijack calls to the original Lexical APIs and implement extension specific workarounds
 */
import * as lexical from 'lexicalOriginal';
export * from 'lexicalOriginal';
export declare function $getRoot(): lexical.RootNode;
export declare function $getSelection(): null | lexical.BaseSelection;
export declare function $isElementNode(node: lexical.LexicalNode | null | undefined): node is lexical.ElementNode;
export declare function $isTextNode(node: lexical.LexicalNode | null | undefined): node is lexical.TextNode;
export declare function $isRangeSelection(x: unknown): x is lexical.RangeSelection;
export declare function $isNodeSelection(x: unknown): x is lexical.NodeSelection;
export declare function readEditorState<V>(editor: lexical.LexicalEditor, editorState: lexical.EditorState, callbackFn: () => V): V;
//# sourceMappingURL=lexicalForExtension.d.ts.map