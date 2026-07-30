/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Bundle-size probe: @lexical/mdast import only. An editor with the
 * markdown node set, streaming typing shortcuts, and markdown import — no
 * serialization back to Markdown, so `MdastExportExtension` (and with it
 * `mdast-util-to-markdown`) should be tree-shaken away.
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  MdastCommonMarkExtension,
  MdastShortcutsExtension,
  MdastStrikethroughExtension,
  MdastTaskListExtension,
} from '@lexical/mdast';
import {defineExtension, type LexicalEditor} from 'lexical';

export function createMarkdownEditor(): LexicalEditor {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastStrikethroughExtension,
        MdastTaskListExtension,
        MdastShortcutsExtension,
      ],
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
