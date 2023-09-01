/** @module @lexical/text */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Klass, LexicalEditor, RootNode } from 'lexical';
import { TextNode } from 'lexical';
export type TextNodeWithOffset = {
    node: TextNode;
    offset: number;
};
/**
 * Finds a TextNode with a size larger than targetCharacters and returns
 * the node along with the remaining length of the text.
 * @param root - The RootNode.
 * @param targetCharacters - The number of characters whose TextNode must be larger than.
 * @returns The TextNode and the intersections offset, or null if no TextNode is found.
 */
export declare function $findTextIntersectionFromCharacters(root: RootNode, targetCharacters: number): null | {
    node: TextNode;
    offset: number;
};
/**
 * Determines if the root has any text content and can trim any whitespace if it does.
 * @param isEditorComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @param trim - Should the root text have its whitespaced trimmed? Defaults to true.
 * @returns true if text content is empty, false if there is text or isEditorComposing is true.
 */
export declare function $isRootTextContentEmpty(isEditorComposing: boolean, trim?: boolean): boolean;
/**
 * Returns a function that executes {@link $isRootTextContentEmpty}
 * @param isEditorComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @param trim - Should the root text have its whitespaced trimmed? Defaults to true.
 * @returns A function that executes $isRootTextContentEmpty based on arguments.
 */
export declare function $isRootTextContentEmptyCurry(isEditorComposing: boolean, trim?: boolean): () => boolean;
/**
 * Returns the root's text content.
 * @returns The root's text content.
 */
export declare function $rootTextContent(): string;
/**
 * Determines if the input should show the placeholder. If anything is in
 * in the root the placeholder should not be shown.
 * @param isComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @returns true if the input should show the placeholder, false otherwise.
 */
export declare function $canShowPlaceholder(isComposing: boolean): boolean;
/**
 * Returns a function that executes {@link $canShowPlaceholder}
 * @param isEditorComposing - Is the editor in composition mode due to an active Input Method Editor?
 * @returns A function that executes $canShowPlaceholder with arguments.
 */
export declare function $canShowPlaceholderCurry(isEditorComposing: boolean): () => boolean;
export type EntityMatch = {
    end: number;
    start: number;
};
/**
 * Returns a touple that can be rested (...) into mergeRegister to clean up
 * node transforms listeners that transforms text into another node, eg. a HashtagNode.
 * @example
 * ```ts
 *   useEffect(() => {
    return mergeRegister(
      ...registerLexicalTextEntity(editor, getMatch, targetNode, createNode),
    );
  }, [createNode, editor, getMatch, targetNode]);
 * ```
 * Where targetNode is the type of node containing the text you want to transform (like a text input),
 * then getMatch uses a regex to find a matching text and creates the proper node to include the matching text.
 * @param editor - The lexical editor.
 * @param getMatch - Finds a matching string that satisfies a regex expression.
 * @param targetNode - The node type that contains text to match with. eg. HashtagNode
 * @param createNode - A function that creates a new node to contain the matched text. eg createHashtagNode
 * @returns An array containing the plain text and reverse node transform listeners.
 */
export declare function registerLexicalTextEntity<T extends TextNode>(editor: LexicalEditor, getMatch: (text: string) => null | EntityMatch, targetNode: Klass<T>, createNode: (textNode: TextNode) => T): Array<() => void>;
