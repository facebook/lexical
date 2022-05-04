/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalEditor,
  ElementNode,
  LexicalNode,
  TextFormatType,
} from 'lexical';

export type Transformer =
  | ElementTransformer
  | TextFormatTransformer
  | TextMatchTransformer;

export type ElementTransformer = {
  export: (
    node: LexicalNode,
    traverseChildren: (node: ElementNode) => string,
  ) => string | null;
  regExp: RegExp;
  replace: (
    parentNode: ElementNode,
    children: Array<LexicalNode>,
    match: Array<string>,
    isImport: boolean,
  ) => void;
  type: 'element';
};

export type TextFormatTransformer = $ReadOnly<{
  format: $ReadOnlyArray<TextFormatType>;
  tag: string;
  type: 'text-format';
}>;

export type TextMatchTransformer = $ReadOnly<{
  export: (
    node: LexicalNode,
    exportChildren: (node: ElementNode) => string,
    exportFormat: (node: TextNode, textContent: string) => string,
  ) => string | null;
  importRegExp: RegExp;
  regExp: RegExp;
  replace: (node: TextNode, match: RegExp$matchResult) => void;
  trigger: string;
  type: 'text-match';
}>;

// TODO:
// transformers should be required argument, breaking change
export function registerMarkdownShortcuts(
  editor: LexicalEditor,
  transformers?: Array<Transformer>,
): () => void;

// TODO:
// transformers should be required argument, breaking change
export function $convertFromMarkdownString(
  markdown: string,
  transformers?: Array<Transformer>,
): void;

// TODO:
// transformers should be required argument, breaking change
export function $convertToMarkdownString(
  transformers?: Array<Transformer>,
): string;

export const BOLD_ITALIC_STAR: TextFormatTransformer;
export const BOLD_ITALIC_UNDERSCORE: TextFormatTransformer;
export const BOLD_STAR: TextFormatTransformer;
export const BOLD_UNDERSCORE: TextFormatTransformer;
export const INLINE_CODE: TextFormatTransformer;
export const ITALIC_STAR: TextFormatTransformer;
export const ITALIC_UNDERSCORE: TextFormatTransformer;
export const STRIKETHROUGH: TextFormatTransformer;

export const UNORDERED_LIST: ElementTransformer;
export const CODE: ElementTransformer;
export const HEADING: ElementTransformer;
export const ORDERED_LIST: ElementTransformer;
export const QUOTE: ElementTransformer;
export const CHECK_LIST: ElementTransformer;

export const LINK: TextMatchTransformer;

export const TRANSFORMERS: Array<Transformer>;
export const ELEMENT_TRANSFORMERS: Array<ElementTransformer>;
export const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer>;
export const TEXT_MATCH_TRANSFORMERS: Array<TextFormatTransformer>;
