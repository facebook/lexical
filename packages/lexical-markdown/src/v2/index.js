/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  BlockTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
} from './MarkdownTransformers';
import type {Array} from 'yjs';

import {createMarkdownExport} from './MarkdownExport';
import {createMarkdownImport} from './MarkdownImport';
import {registerMarkdownShortcuts} from './MarkdownShortcuts';
import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
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
} from './MarkdownTransformers';

const BLOCK_TRANSFORMERS: Array<BlockTransformer> = [
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
];

const TEXT_FORMAT_TRANSFORMERS: Array<TextFormatTransformer> = [
  // Order of text format transformers matters:
  //
  // - code should go first as it prevents any transformations inside
  // - then longer tags match (e.g. ** or __ should go before * or _)
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

const TRANSFORMERS: [
  Array<BlockTransformer>,
  Array<TextFormatTransformer>,
  Array<TextMatchTransformer>,
] = [BLOCK_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS, TEXT_MATCH_TRANSFORMERS];

export {
  BLOCK_TRANSFORMERS,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CODE,
  HEADING,
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
};

export {createMarkdownExport, createMarkdownImport, registerMarkdownShortcuts};
