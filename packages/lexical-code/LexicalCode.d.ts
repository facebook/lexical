/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
  EditorThemeClasses,
  LexicalEditor,
  SerializedElementNode,
  SerializedTextNode,
} from 'lexical';

import {ElementNode, TextNode} from 'lexical';
import {Spread} from 'libdefs/globals';

declare class CodeNode extends ElementNode {
  static getType(): string;
  static clone(node: CodeNode): CodeNode;
  constructor(key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean;
  insertNewAfter(
    selection: RangeSelection,
  ): null | ParagraphNode | CodeHighlightNode;
  canInsertTab(): boolean;
  collapseAtStart(): true;
  setLanguage(language: string): void;
  getLanguage(): string | void;
  importJSON(serializedNode: SerializedCodeNode): CodeNode;
  exportJSON(): SerializedElementNode;
}
declare function $createCodeNode(language?: string): CodeNode;
declare function $isCodeNode(
  node: null | undefined | LexicalNode,
): node is CodeNode;

declare function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): null | undefined | CodeHighlightNode;

declare function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): null | undefined | CodeHighlightNode;

declare function getDefaultCodeLanguage(): string;
declare function getCodeLanguages(): Array<string>;

declare class CodeHighlightNode extends TextNode {
  __highlightType: null | undefined | string;
  constructor(text: string, highlightType?: string, key?: NodeKey);
  static getType(): string;
  static clone(node: CodeHighlightNode): CodeHighlightNode;
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean;
  setFormat(format: number): this;
}
declare function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: null | undefined | string,
): null | undefined | string;
declare function $createCodeHighlightNode(
  text: string,
  highlightType?: string,
): CodeHighlightNode;
declare function $isCodeHighlightNode(
  node: LexicalNode | null | undefined,
): node is CodeHighlightNode;

declare function registerCodeHighlighting(
  editor: LexicalEditor,
  threshold: number,
): () => void;
declare function registerCodeIndent(editor: LexicalEditor): () => void;

type SerializedCodeNode = Spread<
  {
    language: string | null | undefined;
    type: 'code';
    version: 1;
  },
  SerializedElementNode
>;

type SerializedCodeHighlightNode = Spread<
  {
    highlightType: string | null | undefined;
    type: 'code-highlight';
    version: 1;
  },
  SerializedTextNode
>;
