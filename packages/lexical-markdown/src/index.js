/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from '../flow/LexicalMarkdown';

import {createMarkdownExport} from './v2/MarkdownExport';
import {createMarkdownImport} from './v2/MarkdownImport';
import {registerMarkdownShortcuts} from './v2/MarkdownShortcuts';
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from './v2/MarkdownTransformers';

const ELEMENT_TRANSFORMERS: Array<ElementTransformer> = [
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
];

// Order of text format transformers matters:
//
// - code should go first as it prevents any transformations inside
// - then longer tags match (e.g. ** or __ should go before * or _)
const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer> = [
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

const TEXT_MATCH_TRANSFORMERS: Array<TextMatchTransformer> = [LINK];

const TRANSFORMERS: Array<Transformer> = [
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
  ...TEXT_MATCH_TRANSFORMERS,
];

function $convertFromMarkdownString(
  markdown: string,
  transformers?: Array<Transformer> = TRANSFORMERS,
): void {
  const importMarkdown = createMarkdownImport(transformers);
  return importMarkdown(markdown);
}

function $convertToMarkdownString(
  transformers?: Array<Transformer> = TRANSFORMERS,
): string {
  const exportMarkdown = createMarkdownExport(transformers);
  return exportMarkdown();
}

export type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
};

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
  HEADING,
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
  TRANSFORMERS,
  UNORDERED_LIST,
};
