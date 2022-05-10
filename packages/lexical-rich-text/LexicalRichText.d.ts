/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  DOMConversionMap,
  EditorConfig,
  EditorState,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  LexicalEditor,
} from 'lexical';
import {ElementNode} from 'lexical';
export type InitialEditorStateType = null | string | EditorState | (() => void);

export declare class QuoteNode extends ElementNode {
  static getType(): string;
  static clone(node: QuoteNode): QuoteNode;
  constructor(key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createQuoteNode(): QuoteNode;
export function $isQuoteNode(
  node: LexicalNode | null | undefined,
): node is QuoteNode;
export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export declare class HeadingNode extends ElementNode {
  __tag: HeadingTagType;
  static getType(): string;
  static clone(node: HeadingNode): HeadingNode;
  constructor(tag: HeadingTagType, key?: NodeKey);
  getTag(): HeadingTagType;
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean;
  static importDOM(): DOMConversionMap | null;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createHeadingNode(headingTag: HeadingTagType): HeadingNode;
export function $isHeadingNode(
  node: LexicalNode | null | undefined,
): node is HeadingNode;
export function registerRichText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void;
