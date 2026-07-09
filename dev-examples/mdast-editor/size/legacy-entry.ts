/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Bundle-size probe: the legacy @lexical/markdown stack. Functionally
 * equivalent surface to ./mdast-entry.ts — an editor with the markdown
 * node set, typing shortcuts, and markdown import/export.
 */

import {CodeNode} from '@lexical/code-core';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  registerMarkdownShortcuts,
  TRANSFORMERS,
} from '@lexical/markdown';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {createEditor, type LexicalEditor} from 'lexical';

export function createMarkdownEditor(): LexicalEditor {
  const editor = createEditor({
    namespace: 'size-probe',
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
    onError: (error: Error) => {
      throw error;
    },
  });
  registerMarkdownShortcuts(editor, TRANSFORMERS);
  return editor;
}

export function markdownToEditor(
  editor: LexicalEditor,
  markdown: string,
): void {
  editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS));
}

export function editorToMarkdown(editor: LexicalEditor): string {
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}
