/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from './MarkdownTransformers';
import type {ElementNode} from 'lexical';

import {createMarkdownExport} from './MarkdownExport';
import {createMarkdownImport} from './MarkdownImport';
import {registerMarkdownShortcuts} from './MarkdownShortcuts';
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  ELEMENT_TRANSFORMERS,
  HEADING,
  HIGHLIGHT,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TRANSFORMERS,
  UNORDERED_LIST,
} from './MarkdownTransformers';

/**
 * Renders markdown from a string. The selection is moved to the start after the operation.
 */
function $convertFromMarkdownString(
  markdown: string,
  transformers: Array<Transformer> = TRANSFORMERS,
  node?: ElementNode,
  shouldPreserveNewLines = false,
): void {
  const importMarkdown = createMarkdownImport(
    transformers,
    shouldPreserveNewLines,
  );
  return importMarkdown(markdown, node);
}

/**
 * Renders string from markdown. The selection is moved to the start after the operation.
 */
function $convertToMarkdownString(
  transformers: Array<Transformer> = TRANSFORMERS,
  node?: ElementNode,
  shouldPreserveNewLines: boolean = false,
): string {
  const exportMarkdown = createMarkdownExport(
    transformers,
    shouldPreserveNewLines,
  );
  return exportMarkdown(node);
}

export {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  ELEMENT_TRANSFORMERS,
  ElementTransformer,
  HEADING,
  HIGHLIGHT,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  registerMarkdownShortcuts,
  STRIKETHROUGH,
  TEXT_FORMAT_TRANSFORMERS,
  TEXT_MATCH_TRANSFORMERS,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
  TRANSFORMERS,
  UNORDERED_LIST,
};
