/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastBlockMatch} from './MdastStream';
import type {MdastNode, MdastTransformer} from './types';
import type {ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';
import type {ElementNode, LexicalEditor, LexicalNode, TextNode} from 'lexical';
import type {List} from 'mdast';

import {$createCodeNode, $isCodeNode} from '@lexical/code-core';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import {$createHeadingNode, $createQuoteNode} from '@lexical/rich-text';
import {
  $addUpdateTag,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_LOW,
  HISTORIC_TAG,
  HISTORY_PUSH_TAG,
  KEY_ENTER_COMMAND,
  mergeRegister,
} from 'lexical';

import {MarkdownStreamScanner} from './MdastStream';
import {TRANSFORMERS} from './MdastTransformers';

/** Characters that can close an inline construct and so warrant a re-scan. */
const INLINE_TRIGGERS = new Set<string>(['*', '_', '`', '~', ')']);

function $listTypeFromMdast(node: List): ListType {
  if (node.ordered) {
    return 'number';
  }
  for (const child of node.children) {
    if (child.type === 'listItem' && child.checked != null) {
      return 'check';
    }
  }
  return 'bullet';
}

/** Removes the first `n` characters from the leading text nodes of `element`. */
function $stripLeading(element: ElementNode, n: number): void {
  let remaining = n;
  let child = element.getFirstChild();
  while (remaining > 0 && child) {
    if (!$isTextNode(child)) {
      break;
    }
    const text = child.getTextContent();
    if (text.length <= remaining) {
      const next = child.getNextSibling();
      remaining -= text.length;
      child.remove();
      child = next;
    } else {
      child.setTextContent(text.slice(remaining));
      remaining = 0;
    }
  }
}

/**
 * Replaces `paragraph` with the block construct described by `match`, keeping
 * the content that followed the marker.
 */
function $applyBlock(paragraph: ElementNode, match: MdastBlockMatch): boolean {
  $stripLeading(paragraph, match.markerLength);
  const remaining = paragraph.getChildren();

  if (match.kind === 'code') {
    const code = $createCodeNode(match.node.lang || undefined);
    const text = remaining.map(node => node.getTextContent()).join('');
    if (text) {
      code.append($createTextNode(text));
    }
    paragraph.replace(code);
    code.selectStart();
    return true;
  }

  let target: ElementNode;
  let selectInto: ElementNode;
  if (match.kind === 'heading') {
    const depth = Math.min(6, Math.max(1, match.node.depth));
    const heading = $createHeadingNode(`h${depth}` as HeadingTagType);
    heading.append(...remaining);
    target = heading;
    selectInto = heading;
  } else if (match.kind === 'blockquote') {
    const quote = $createQuoteNode();
    quote.append(...remaining);
    target = quote;
    selectInto = quote;
  } else {
    const listNode = match.node;
    const listType = $listTypeFromMdast(listNode);
    const start =
      listNode.ordered && listNode.start != null ? listNode.start : 1;
    const list = $createListNode(listType, start);
    const firstItem = listNode.children[0];
    const checked =
      firstItem &&
      firstItem.type === 'listItem' &&
      typeof firstItem.checked === 'boolean'
        ? firstItem.checked
        : undefined;
    const item = $createListItemNode(checked);
    item.append(...remaining);
    list.append(item);
    target = list;
    selectInto = item;
  }

  paragraph.replace(target);
  selectInto.selectStart();
  return true;
}

/**
 * Materializes the inline construct ending at `anchorOffset` inside
 * `anchorNode`, replacing the raw markdown span with formatted Lexical nodes.
 */
function $applyInline(
  anchorNode: TextNode,
  anchorOffset: number,
  scanner: MarkdownStreamScanner,
): boolean {
  const upTo = anchorNode.getTextContent().slice(0, anchorOffset);
  const inlineNode = scanner.scanInline(upTo);
  if (!inlineNode || !inlineNode.position) {
    return false;
  }
  const start = inlineNode.position.start.offset ?? 0;
  const end = anchorOffset;

  let target: TextNode;
  if (start <= 0) {
    [target] = anchorNode.splitText(end);
  } else {
    const parts = anchorNode.splitText(start, end);
    target = parts.length === 3 ? parts[1] : parts[parts.length - 1];
  }

  const lexicalNodes = scanner.importInline(inlineNode as MdastNode);
  if (lexicalNodes.length === 0) {
    return false;
  }

  let prev: LexicalNode = lexicalNodes[0];
  target.replace(prev);
  for (let i = 1; i < lexicalNodes.length; i++) {
    prev.insertAfter(lexicalNodes[i]);
    prev = lexicalNodes[i];
  }

  if ($isTextNode(prev)) {
    const size = prev.getTextContentSize();
    prev.select(size, size);
  } else {
    prev.selectNext(0, 0);
  }
  return true;
}

/** Matches a GFM task-list checkbox marker (`[ ] `, `[x] `) typed at line start. */
const CHECKBOX_REGEX = /^\[([ xX]?)\]\s$/;

/**
 * Handles a checkbox marker typed at the start of a line. micromark only
 * recognizes a task-list item once it already has a list-item prefix, so by
 * the time the user types `[ ] ` the paragraph is usually already a bullet
 * list item (from the earlier `- ` shortcut). This promotes that item — or a
 * bare paragraph — to a Lexical check list.
 */
function $tryCheckbox(
  anchorNode: TextNode,
  parent: ElementNode,
  anchorOffset: number,
): boolean {
  if (parent.getFirstChild() !== anchorNode) {
    return false;
  }
  const prefix = parent.getTextContent().slice(0, anchorOffset);
  const match = prefix.match(CHECKBOX_REGEX);
  if (!match) {
    return false;
  }
  const checked = match[1].toLowerCase() === 'x';

  if ($isListItemNode(parent)) {
    const list = parent.getParent();
    if (!$isListNode(list) || list.getListType() === 'number') {
      return false;
    }
    $stripLeading(parent, match[0].length);
    list.setListType('check');
    parent.setChecked(checked);
    return true;
  }

  if ($isShortcutParagraph(parent, anchorNode)) {
    $stripLeading(parent, match[0].length);
    const remaining = parent.getChildren();
    const list = $createListNode('check');
    const item = $createListItemNode(checked);
    item.append(...remaining);
    list.append(item);
    parent.replace(list);
    item.selectStart();
    return true;
  }

  return false;
}

function $isShortcutParagraph(
  node: LexicalNode,
  anchorNode: TextNode,
): boolean {
  return (
    $isParagraphNode(node) &&
    $isRootOrShadowRoot(node.getParent()) &&
    node.getFirstChild() === anchorNode
  );
}

export interface MdastShortcutsOptions {
  transformers?: readonly MdastTransformer[];
}

/**
 * Registers streaming Markdown shortcuts on `editor`. As the user types, the
 * current line/inline buffer is fed back through micromark (the same parser as
 * full-document import) and recognized constructs are transformed in place:
 *
 * - Block markers (`# `, `> `, `- `, `1. `, `- [ ] `) convert the paragraph
 *   into the matching Lexical block as soon as the trailing space is typed.
 * - Fenced code (`` ```lang ``) converts on <kbd>Enter</kbd>.
 * - Inline constructs (`*em*`, `**strong**`, `` `code` ``, `~~del~~`,
 *   `[text](url)`) convert when their closing delimiter is typed.
 */
export function registerMarkdownShortcuts(
  editor: LexicalEditor,
  transformers: readonly MdastTransformer[] = TRANSFORMERS,
): () => void {
  const scanner = new MarkdownStreamScanner(transformers);

  return mergeRegister(
    editor.registerUpdateListener(
      ({tags, dirtyLeaves, editorState, prevEditorState}) => {
        if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) {
          return;
        }
        if (editor.isComposing()) {
          return;
        }
        const selection = editorState.read($getSelection);
        const prevSelection = prevEditorState.read($getSelection);
        if (
          !$isRangeSelection(selection) ||
          !$isRangeSelection(prevSelection) ||
          !selection.isCollapsed() ||
          selection.is(prevSelection)
        ) {
          return;
        }
        const anchorKey = selection.anchor.key;
        const anchorOffset = selection.anchor.offset;
        const anchorNode = editorState._nodeMap.get(anchorKey);
        if (!$isTextNode(anchorNode) || !dirtyLeaves.has(anchorKey)) {
          return;
        }
        const typedChar = editorState.read(() => anchorNode.getTextContent())[
          anchorOffset - 1
        ];
        if (typedChar !== ' ' && !INLINE_TRIGGERS.has(typedChar)) {
          return;
        }

        editor.update(() => {
          const node = $getNodeByKey(anchorKey);
          if (!$isTextNode(node)) {
            return;
          }
          const parent = node.getParent();
          if (parent === null || $isCodeNode(parent)) {
            return;
          }

          let transformed = false;
          if (typedChar === ' ') {
            if ($tryCheckbox(node, parent, anchorOffset)) {
              transformed = true;
            } else if ($isShortcutParagraph(parent, node)) {
              const match = scanner.scanBlock(parent.getTextContent());
              if (
                match &&
                match.kind !== 'code' &&
                match.markerLength === anchorOffset
              ) {
                transformed = $applyBlock(parent, match);
              }
            }
          } else {
            transformed = $applyInline(node, anchorOffset, scanner);
          }

          if (transformed) {
            $addUpdateTag(HISTORY_PUSH_TAG);
          }
        });
      },
    ),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      event => {
        if (event !== null && event.shiftKey) {
          return false;
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        const anchorNode = selection.anchor.getNode();
        if (!$isTextNode(anchorNode)) {
          return false;
        }
        const parent = anchorNode.getParent();
        if (
          parent === null ||
          $isCodeNode(parent) ||
          !$isShortcutParagraph(parent, anchorNode) ||
          selection.anchor.offset !== anchorNode.getTextContentSize()
        ) {
          return false;
        }
        const match = scanner.scanBlock(parent.getTextContent());
        if (match && $applyBlock(parent, match)) {
          if (event !== null) {
            event.preventDefault();
          }
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
}
