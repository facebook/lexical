/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { DecoratorNode, LexicalEditor, RootNode } from 'lexical';
export declare function convertStringToLexical(text: string, editor: LexicalEditor): null | RootNode;
export declare function convertMarkdownForElementNodes<T>(editor: LexicalEditor, createHorizontalRuleNode: null | (() => DecoratorNode<T>)): void;
