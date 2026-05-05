/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {TabIndentationExtension} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ORDERED_LIST,
  registerMarkdownShortcuts,
  type Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown';
import {RichTextExtension} from '@lexical/rich-text';
import {defineExtension, safeCast} from 'lexical';

/**
 * The set of markdown transformers used by both the live preview
 * (export to markdown) and the inline shortcuts (typing markdown
 * syntax in the editor). This deliberately covers the same features
 * the example advertises: headings, bold, italics, inline code,
 * ordered/unordered lists and check lists.
 */
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
];

export interface MarkdownConfig {
  transformers: Array<Transformer>;
}

/**
 * A self-contained markdown extension. It pulls in all of the node
 * dependencies that the supplied transformers require (rich text,
 * lists, check lists, history, tab indentation) and registers the
 * markdown shortcut handler so typing `# `, `**bold**`, `` `code` ``,
 * `- item`, `1. item`, `- [ ] todo`, etc. transforms inline.
 */
export const MarkdownExtension = defineExtension({
  config: safeCast<MarkdownConfig>({
    transformers: MARKDOWN_TRANSFORMERS,
  }),
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    CheckListExtension,
    TabIndentationExtension,
  ],
  name: '@lexical/markdown-editor-example/Markdown',
  register(editor, {transformers}) {
    return registerMarkdownShortcuts(editor, transformers);
  },
});
