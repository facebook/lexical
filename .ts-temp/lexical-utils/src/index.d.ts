/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState, ElementNode, LexicalEditor, LexicalNode } from 'lexical';
import { Class } from 'utility-types';
export declare type DFSNode = Readonly<{
    depth: number;
    node: LexicalNode;
}>;
export declare function addClassNamesToElement(element: HTMLElement, ...classNames: Array<typeof undefined | boolean | null | string>): void;
export declare function removeClassNamesFromElement(element: HTMLElement, ...classNames: Array<string>): void;
export declare function $dfs(startingNode?: LexicalNode, endingNode?: LexicalNode): Array<DFSNode>;
export declare function $getNearestNodeOfType<T extends ElementNode>(node: LexicalNode, klass: Class<T>): T | LexicalNode;
export declare function $getNearestBlockElementAncestorOrThrow(startNode: LexicalNode): ElementNode;
export declare type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;
export declare type DOMNodeToLexicalConversionMap = Record<string, DOMNodeToLexicalConversion>;
export declare function $findMatchingParent(startingNode: LexicalNode, findFn: (node: LexicalNode) => boolean): LexicalNode | null;
declare type Func = () => void;
export declare function mergeRegister(...func: Array<Func>): () => void;
export declare function registerNestedElementResolver<N extends ElementNode>(editor: LexicalEditor, targetNode: {
    new (): N;
}, cloneNode: (from: N) => N, handleOverlap: (from: N, to: N) => void): () => void;
export declare function unstable_convertLegacyJSONEditorState(editor: LexicalEditor, maybeStringifiedEditorState: string): EditorState;
export declare function $restoreEditorState(editor: LexicalEditor, editorState: EditorState): void;
export {};
