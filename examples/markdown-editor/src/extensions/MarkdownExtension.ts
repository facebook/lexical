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
  TabIndentationExtension,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {
  $isListItemNode,
  $isListNode,
  CheckListExtension,
  ListExtension,
  ListItemNode,
} from '@lexical/list';
import {
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ORDERED_LIST,
  registerMarkdownShortcuts,
  type TextMatchTransformer,
  type Transformer,
  UNORDERED_LIST,
} from '@lexical/markdown';
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
  safeCast,
} from 'lexical';

/**
 * Catches `[ ]` / `[x]` typed at the start of an existing list item.
 *
 * The standard {@link CHECK_LIST} element transformer only fires when
 * the parent block is a paragraph at the document root, so once the
 * user has typed `- ` (which UNORDERED_LIST converts into a bullet
 * list) the line is no longer eligible. A `text-match` transformer
 * has no such grandparent restriction — its `replace` callback runs
 * wherever the trigger character (space) lands and the regex matches,
 * including inside a `ListItemNode`.
 *
 * Only `regExp` (no `importRegExp`) is provided, so this transformer
 * is purely a typing-time shortcut and never fires during markdown
 * import. Export is handled by {@link CHECK_LIST}.
 */
const CHECK_LIST_ITEM: TextMatchTransformer = {
  dependencies: [ListItemNode],
  regExp: /^\[(\s|x|X)?\]\s$/,
  replace: (textNode, match) => {
    const listItem = textNode.getParent();
    if (!$isListItemNode(listItem)) {
      return;
    }
    const list = listItem.getParent();
    if (!$isListNode(list)) {
      return;
    }
    if (list.getListType() !== 'check') {
      list.setListType('check');
      // Items that were previously bullet/number have `__checked` set
      // to undefined. Default the others to unchecked so they render
      // as proper checkboxes once the list type changes.
      for (const sibling of list.getChildren()) {
        if (
          $isListItemNode(sibling) &&
          !sibling.is(listItem) &&
          sibling.getChecked() === undefined
        ) {
          sibling.setChecked(false);
        }
      }
    }
    listItem.setChecked((match[1] ?? '').toLowerCase() === 'x');
    textNode.remove();
  },
  trigger: ' ',
  type: 'text-match',
};

/**
 * The set of markdown transformers used by both the live preview
 * (export to markdown) and the inline shortcuts (typing markdown
 * syntax in the editor). This deliberately covers the same features
 * the example advertises: headings, bold, italics, inline code,
 * ordered/unordered lists and check lists.
 *
 * `CHECK_LIST` must come before `UNORDERED_LIST` / `ORDERED_LIST` so
 * that `- [ ] foo` in imported markdown matches the checklist regex
 * before the plain list regex catches the leading `- `.
 *
 * `CHECK_LIST_ITEM` is the typing-time companion: when the user has
 * already turned a line into a bullet/numbered item by typing `- ` /
 * `1. ` and then types `[ ] ` or `[x] `, this transformer flips the
 * list to a checklist in place.
 */
export const MARKDOWN_TRANSFORMERS: Transformer[] = [
  HEADING,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
  CHECK_LIST_ITEM,
];

export interface MarkdownConfig {
  transformers: Transformer[];
}

/**
 * Reformats the current selection's blocks as a paragraph. Toolbars
 * and other UI should dispatch this command rather than calling
 * `$setBlocksType` directly so the markdown extension is the single
 * owner of block-formatting behavior.
 */
export const FORMAT_PARAGRAPH_COMMAND: LexicalCommand<void> = createCommand(
  'FORMAT_PARAGRAPH_COMMAND',
);

/**
 * Reformats the current selection's blocks as the given heading.
 */
export const FORMAT_HEADING_COMMAND: LexicalCommand<HeadingTagType> =
  createCommand('FORMAT_HEADING_COMMAND');

/**
 * A self-contained markdown extension. It pulls in all of the node
 * dependencies that the supplied transformers require (rich text,
 * lists, check lists, history, tab indentation), registers the
 * markdown shortcut handler so typing `# `, `**bold**`, `` `code` ``,
 * `- item`, `1. item`, `[ ] todo`, etc. transforms inline, registers
 * paragraph/heading block-format commands, and exposes the current
 * editor content as a markdown string through the `markdown` output
 * signal.
 */
export const MarkdownExtension = defineExtension({
  build(editor, {transformers}, state) {
    const editorState = state.getDependency(EditorStateExtension).output;
    return {
      markdown: computed(() =>
        editorState.value.read(() => $convertToMarkdownString(transformers), {
          editor,
        }),
      ),
    };
  },
  config: safeCast<MarkdownConfig>({
    transformers: MARKDOWN_TRANSFORMERS,
  }),
  dependencies: [
    RichTextExtension,
    HistoryExtension,
    ListExtension,
    CheckListExtension,
    TabIndentationExtension,
    EditorStateExtension,
  ],
  name: '@lexical/markdown-editor-example/Markdown',
  register(editor, {transformers}) {
    return mergeRegister(
      registerMarkdownShortcuts(editor, transformers),
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
