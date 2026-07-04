/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Bundle-size probe: the @lexical/mdast markdown stack. Functionally
 * equivalent surface to ./legacy-entry.ts — an editor with the markdown
 * node set, streaming typing shortcuts, and markdown import/export.
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastShortcutsExtension,
} from '@lexical/mdast';
import {defineExtension, type LexicalEditor} from 'lexical';

export function createMarkdownEditor(): LexicalEditor {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [MdastShortcutsExtension],
      name: '[root]',
    }),
  );
}

export function markdownToEditor(
  editor: LexicalEditor,
  markdown: string,
): void {
  editor.update(() => $convertFromMarkdownString(markdown));
}

export function editorToMarkdown(editor: LexicalEditor): string {
  return editor.read(() => $convertToMarkdownString());
}
