/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ElementNode, LexicalEditor, RootNode, TextNode} from 'lexical';
import {Class} from 'utility-types';
export type TextNodeWithOffset = {
  node: TextNode;
  offset: number;
};
export function $findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {
  node: TextNode;
  offset: number;
};
export function $joinTextNodesInElementNode(
  elementNode: ElementNode,
  separator: string,
  stopAt: TextNodeWithOffset,
): string;
export function $findNodeWithOffsetFromJoinedText(
  offsetInJoinedText: number,
  joinedTextLength: number,
  separatorLength: number,
  elementNode: ElementNode,
): TextNodeWithOffset | null | undefined;
export function $isRootTextContentEmpty(
  isEditorComposing: boolean,
  trim?: boolean,
): boolean;
export function $isRootTextContentEmptyCurry(
  isEditorComposing: boolean,
  trim?: boolean,
): () => boolean;
export function $rootTextContentCurry(): string;
export function $canShowPlaceholder(isComposing: boolean): boolean;
export function $canShowPlaceholderCurry(
  isEditorComposing: boolean,
): () => boolean;
export type EntityMatch = {
  end: number;
  start: number;
};
export function registerLexicalTextEntity<N extends TextNode>(
  editor: LexicalEditor,
  getMatch: (text: string) => null | EntityMatch,
  targetNode: Class<N>,
  createNode: (textNode: TextNode) => N,
): Array<() => void>;
