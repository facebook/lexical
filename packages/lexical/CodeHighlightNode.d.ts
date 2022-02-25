/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  EditorThemeClasses,
  LexicalNode,
  NodeKey,
} from 'lexical';
import {TextNode} from 'lexical';
export declare class CodeHighlightNode extends TextNode {
  __highlightType: string | null | undefined;
  constructor(text: string, highlightType?: string, key?: NodeKey);
  getType(): string;
  clone(node: CodeHighlightNode): CodeHighlightNode;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM<EditorContext>( // $FlowFixMe
    prevNode: CodeHighlightNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean;
  setFormat(format: number): CodeHighlightNode;
}
declare function getHighlightThemeClass(
  theme: EditorThemeClasses,
  highlightType: string | null | undefined,
): string | null | undefined;
export function $createCodeHighlightNode(
  text: string,
  highlightType?: string,
): CodeHighlightNode;
export function $isCodeHighlightNode(
  node: LexicalNode | null | undefined,
): boolean;
