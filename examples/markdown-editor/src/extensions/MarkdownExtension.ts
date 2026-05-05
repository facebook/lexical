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
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  type LexicalCommand,
  safeCast,
  TextNode,
} from 'lexical';

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
 */
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  HEADING,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  INLINE_CODE,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  ITALIC_STAR,
];

/**
 * Matches a `[ ]`, `[]` or `[x]` checklist marker followed by a space
 * at the start of a list item's text content. Used by the typing-time
 * shortcut transform — once the user has typed `- ` the line is
 * already a `bullet` ListItemNode, so the standard CHECK_LIST element
 * transformer (which only fires for top-level paragraphs) cannot turn
 * it into a checklist. This transform plugs that gap.
 */
const CHECK_LIST_ITEM_PREFIX = /^(\[(\s|x|X)?\])\s/;

/**
 * If the first text child of a list item starts with a `[ ]` / `[x]`
 * marker, convert the parent list to a checklist, set the item's
 * checked state, and strip the marker. Returns `true` if a conversion
 * happened, which is useful for testing.
 */
export function $convertListItemPrefixToCheckList(
  listItem: ListItemNode,
): boolean {
  const firstChild = listItem.getFirstChild();
  if (!$isTextNode(firstChild)) {
    return false;
  }
  const text = firstChild.getTextContent();
  const match = text.match(CHECK_LIST_ITEM_PREFIX);
  if (!match) {
    return false;
  }
  const list = listItem.getParent();
  if (!$isListNode(list)) {
    return false;
  }
  if (list.getListType() !== 'check') {
    list.setListType('check');
    // Items that were previously bullet/number have `__checked` set to
    // `undefined`. Default them to unchecked so they render as proper
    // checkboxes once the list type changes.
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
  const isChecked = (match[2] ?? '').toLowerCase() === 'x';
  listItem.setChecked(isChecked);
  firstChild.setTextContent(text.slice(match[0].length));
  return true;
}

export interface MarkdownConfig {
  transformers: Array<Transformer>;
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
 * `- item`, `1. item`, etc. transforms inline, plus a node transform
 * that catches `[ ] ` / `[x] ` typed inside an existing list item and
 * converts it to a checklist, registers paragraph/heading block-format
 * commands, and exposes the current editor content as a markdown
 * string through the `markdown` output signal.
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
      // Fires when a list item is mutated directly (e.g. from
      // $convertFromMarkdownString during import, or from list commands).
      editor.registerNodeTransform(
        ListItemNode,
        $convertListItemPrefixToCheckList,
      ),
      // Mutating a TextNode (e.g. typing) does not by itself mark its
      // parent ListItemNode dirty, so the transform above wouldn't fire
      // for typing. This forwards from the TextNode level.
      editor.registerNodeTransform(TextNode, node => {
        const parent = node.getParent();
        if ($isListItemNode(parent) && parent.getFirstChild() === node) {
          $convertListItemPrefixToCheckList(parent);
        }
      }),
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
