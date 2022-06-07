/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementNode, LexicalEditor, RootNode } from 'lexical';
import { TextNode } from 'lexical';
import { Class } from 'utility-types';
export declare type TextNodeWithOffset = {
    node: TextNode;
    offset: number;
};
export declare function $findTextIntersectionFromCharacters(root: RootNode, targetCharacters: number): null | {
    node: TextNode;
    offset: number;
};
export declare function $joinTextNodesInElementNode(elementNode: ElementNode, separator: string, stopAt: TextNodeWithOffset): string;
export declare function $findNodeWithOffsetFromJoinedText(offsetInJoinedText: number, joinedTextLength: number, separatorLength: number, elementNode: ElementNode): TextNodeWithOffset | null;
export declare function $isRootTextContentEmpty(isEditorComposing: boolean, trim?: boolean): boolean;
export declare function $isRootTextContentEmptyCurry(isEditorComposing: boolean, trim?: boolean): () => boolean;
export declare function $rootTextContent(): string;
export declare function $canShowPlaceholder(isComposing: boolean): boolean;
export declare function $canShowPlaceholderCurry(isEditorComposing: boolean): () => boolean;
export declare type EntityMatch = {
    end: number;
    start: number;
};
export declare function registerLexicalTextEntity<N extends TextNode>(editor: LexicalEditor, getMatch: (text: string) => null | EntityMatch, targetNode: Class<N>, createNode: (textNode: TextNode) => N): Array<() => void>;
