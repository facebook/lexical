/** @module @lexical/markdown */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer } from './MarkdownTransformers';
import type { ElementNode } from 'lexical';
import { registerMarkdownShortcuts } from './MarkdownShortcuts';
import { BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE, BOLD_STAR, BOLD_UNDERSCORE, CHECK_LIST, CODE, HEADING, HIGHLIGHT, INLINE_CODE, ITALIC_STAR, ITALIC_UNDERSCORE, LINK, ORDERED_LIST, QUOTE, STRIKETHROUGH, UNORDERED_LIST } from './MarkdownTransformers';
declare const ELEMENT_TRANSFORMERS: Array<ElementTransformer>;
declare const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer>;
declare const TEXT_MATCH_TRANSFORMERS: Array<TextMatchTransformer>;
declare const TRANSFORMERS: Array<Transformer>;
declare function $convertFromMarkdownString(markdown: string, transformers?: Array<Transformer>, node?: ElementNode): void;
declare function $convertToMarkdownString(transformers?: Array<Transformer>, node?: ElementNode): string;
export { $convertFromMarkdownString, $convertToMarkdownString, BOLD_ITALIC_STAR, BOLD_ITALIC_UNDERSCORE, BOLD_STAR, BOLD_UNDERSCORE, CHECK_LIST, CODE, ELEMENT_TRANSFORMERS, ElementTransformer, HEADING, HIGHLIGHT, INLINE_CODE, ITALIC_STAR, ITALIC_UNDERSCORE, LINK, ORDERED_LIST, QUOTE, registerMarkdownShortcuts, STRIKETHROUGH, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS, TextFormatTransformer, TextMatchTransformer, Transformer, TRANSFORMERS, UNORDERED_LIST, };
export { createBlockNode } from './MarkdownTransformers';
