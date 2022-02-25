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
} from 'lexical';
import type {CodeHighlightNode} from 'lexical/CodeHighlightNode';
import {ElementNode} from 'lexical';
export declare class CodeNode extends ElementNode {
  getType(): string;
  clone(node: CodeNode): CodeNode;
  constructor(key?: NodeKey);
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
export function $createCodeNode(): CodeNode;
export function $isCodeNode(node: LexicalNode | null | undefined): boolean;
export function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined;
export function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined;
