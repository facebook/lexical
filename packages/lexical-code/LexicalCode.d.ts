/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  EditorThemeClasses,
  LexicalEditor,
} from 'lexical';

import {ElementNode} from 'lexical';

declare class CodeNode extends ElementNode {
  static getType(): string;
  static clone(node: CodeNode): CodeNode;
  constructor(key?: NodeKey): void;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | CodeHighlightNode;
  canInsertTab(): true;
  collapseAtStart(): true;
  setLanguage(language: string): void;
  getLanguage(): string | void;
}
declare function $createCodeNode(): CodeNode;
declare function $isCodeNode(node: ?LexicalNode): boolean;

declare function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode;

declare function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): ?CodeHighlightNode;

import {TextNode} from 'lexical';

declare class CodeHighlightNode extends TextNode {
  __highlightType: ?string;
  constructor(text: string, highlightType?: string, key?: NodeKey): void;
  static getType(): string;
  static clone(node: CodeHighlightNode): CodeHighlightNode;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM<EditorContext>(
    // $FlowFixMe
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean;
  setFormat(format: number): this;
}
declare function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: ?string,
): ?string;
declare function $createCodeHighlightNode(
  text: string,
  highlightType?: string,
): CodeHighlightNode;
declare function $isCodeHighlightNode(node: ?LexicalNode): boolean;

declare function registerCodeHighlighting(editor: LexicalEditor): () => void;
