/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  computed,
  EditorStateExtension,
  ReadonlySignal,
  TabIndentationExtension,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {
  $convertToMarkdownString,
  MdastShortcutsExtension,
} from '@lexical/mdast';
import {
  $createHeadingNode,
  type HeadingTagType,
  RichTextExtension,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  type LexicalCommand,
} from 'lexical';

/**
 * Reformats the current selection's blocks as a paragraph. Toolbars
 * and other UI should dispatch this command rather than calling
 * `$setBlocksType` directly so this extension is the single owner of
 * block-formatting behavior.
 */
export const FORMAT_PARAGRAPH_COMMAND: LexicalCommand<void> = createCommand(
  'FORMAT_PARAGRAPH_COMMAND',
);

/**
 * Reformats the current selection's blocks as the given heading.
 */
export const FORMAT_HEADING_COMMAND: LexicalCommand<HeadingTagType> =
  createCommand('FORMAT_HEADING_COMMAND');

export interface MdastEditorOutput {
  /** A signal observing the editor's contents as a Markdown string. */
  markdown: ReadonlySignal<string>;
}

/**
 * The Markdown wiring for this example. Compare with the legacy
 * `examples/markdown-editor` `MarkdownExtension`: because
 * `@lexical/mdast` ships extension-ready, there is no transformer list
 * to curate, no `registerMarkdownShortcuts` call, no checklist
 * text-match workaround (typing `[ ] ` / `[x] ` in a list item is
 * built in), and no newline-normalization configuration —
 * {@link MdastShortcutsExtension} pulls in the CommonMark + GFM
 * grammar, its node dependencies, and the streaming shortcuts on its
 * own. What's left here is example-specific plumbing: the editing
 * behavior extensions, the `markdown` preview signal, and the block
 * format commands the toolbar dispatches.
 */
export const MdastEditorExtension = defineExtension({
  build(editor, _config, state): MdastEditorOutput {
    const editorState = state.getDependency(EditorStateExtension).output;
    return {
      markdown: computed(() =>
        editorState.value.read(() => $convertToMarkdownString(), {editor}),
      ),
    };
  },
  dependencies: [
    MdastShortcutsExtension,
    RichTextExtension,
    ListExtension,
    CheckListExtension,
    HistoryExtension,
    TabIndentationExtension,
    EditorStateExtension,
  ],
  name: '@lexical/dev-mdast-editor-example/MdastEditor',
  register(editor) {
    return mergeRegister(
      editor.registerCommand(
        FORMAT_PARAGRAPH_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        FORMAT_HEADING_COMMAND,
        tag => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode(tag));
          }
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    );
  },
});
