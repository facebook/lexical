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
} from 'lexical';
export type InitialEditorStateType = null | string | EditorState | (() => void);

export declare class QuoteNode extends ElementNode {
  static getType(): string;
  static clone(node: QuoteNode): QuoteNode;
  constructor(key?: NodeKey): void;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createQuoteNode(): QuoteNode;
export function $isQuoteNode(node: ?LexicalNode): boolean;
export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export declare class HeadingNode extends ElementNode {
  __tag: HeadingTagType;
  static getType(): string;
  static clone(node: HeadingNode): HeadingNode;
  constructor(tag: HeadingTagType, key?: NodeKey): void;
  getTag(): HeadingTagType;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean;
  static convertDOM(): DOMConversionMap | null;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createHeadingNode(headingTag: HeadingTagType): HeadingNode;
export function $isHeadingNode(node: ?LexicalNode): boolean;
export function registerRichText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void;
