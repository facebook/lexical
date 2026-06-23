/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  MdastExportHandler,
  MdastImportHandler,
  MdastTransformer,
} from './types';
import type {ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';
import type {LexicalNode} from 'lexical';
import type {
  Blockquote,
  Code,
  Emphasis,
  Heading,
  Html,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Strong,
  Text as MdastText,
} from 'mdast';

import {$createCodeNode, $isCodeNode} from '@lexical/code-core';
import {$createLinkNode, $isAutoLinkNode, $isLinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  TEXT_TYPE_TO_FORMAT,
} from 'lexical';
import {
  gfmAutolinkLiteralFromMarkdown,
  gfmAutolinkLiteralToMarkdown,
} from 'mdast-util-gfm-autolink-literal';
import {
  gfmStrikethroughFromMarkdown,
  gfmStrikethroughToMarkdown,
} from 'mdast-util-gfm-strikethrough';
import {
  gfmTaskListItemFromMarkdown,
  gfmTaskListItemToMarkdown,
} from 'mdast-util-gfm-task-list-item';
import {gfmAutolinkLiteral} from 'micromark-extension-gfm-autolink-literal';
import {gfmStrikethrough} from 'micromark-extension-gfm-strikethrough';
import {gfmTaskListItem} from 'micromark-extension-gfm-task-list-item';

const FORMAT_BOLD = TEXT_TYPE_TO_FORMAT.bold;
const FORMAT_ITALIC = TEXT_TYPE_TO_FORMAT.italic;
const FORMAT_STRIKETHROUGH = TEXT_TYPE_TO_FORMAT.strikethrough;
const FORMAT_CODE = TEXT_TYPE_TO_FORMAT.code;

/* -------------------------------------------------------------------------- *
 * Import handlers: mdast node -> Lexical node(s)                              *
 * -------------------------------------------------------------------------- */

const $importParagraph: MdastImportHandler<Paragraph> = (node, ctx) => {
  const paragraph = $createParagraphNode();
  paragraph.append(...ctx.importChildren(node));
  return paragraph;
};

const $importHeading: MdastImportHandler<Heading> = (node, ctx) => {
  const heading = $createHeadingNode(`h${node.depth}` as HeadingTagType);
  heading.append(...ctx.importChildren(node));
  return heading;
};

const $importBlockquote: MdastImportHandler<Blockquote> = (node, ctx) => {
  const quote = $createQuoteNode();
  const children: LexicalNode[] = [];
  for (const child of node.children) {
    if (child.type === 'paragraph') {
      if (children.length > 0) {
        children.push($createLineBreakNode());
      }
      children.push(...ctx.importChildren(child));
    } else {
      // Nested blocks (lists, code, nested quotes) are imported as-is so they
      // are not silently flattened to text.
      children.push(...ctx.importNode(child));
    }
  }
  quote.append(...children);
  return quote;
};

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

const $importList: MdastImportHandler<List> = (node, ctx) => {
  const listType = $listTypeFromMdast(node);
  const start = node.ordered && node.start != null ? node.start : 1;
  const list = $createListNode(listType, start);
  for (const child of node.children) {
    list.append(...ctx.importNode(child));
  }
  return list;
};

const $importListItem: MdastImportHandler<ListItem> = (node, ctx) => {
  const item = $createListItemNode(
    typeof node.checked === 'boolean' ? node.checked : undefined,
  );
  const extraItems: ListItemNode[] = [];
  for (const child of node.children) {
    if (child.type === 'list') {
      // A nested list is represented in Lexical as a ListItemNode whose only
      // child is the nested ListNode, appended as a sibling of this item.
      const nestedItem = $createListItemNode();
      nestedItem.append(...ctx.importNode(child));
      extraItems.push(nestedItem);
    } else if (child.type === 'paragraph') {
      if (item.getChildrenSize() > 0) {
        item.append($createLineBreakNode());
      }
      item.append(...ctx.importChildren(child));
    } else {
      item.append(...ctx.importNode(child));
    }
  }
  return [item, ...extraItems];
};

const $importCode: MdastImportHandler<Code> = node => {
  const code = $createCodeNode(node.lang || undefined);
  if (node.value) {
    code.append($createTextNode(node.value));
  }
  return code;
};

const importText: MdastImportHandler<MdastText> = (node, ctx) =>
  ctx.createText(node.value);

const importHtml: MdastImportHandler<Html> = (node, ctx) =>
  ctx.createText(node.value);

const importInlineCode: MdastImportHandler<InlineCode> = (node, ctx) =>
  ctx.createText(node.value, ctx.format | FORMAT_CODE);

const importEmphasis: MdastImportHandler<Emphasis> = (node, ctx) =>
  ctx.importChildren(node, FORMAT_ITALIC);

const importStrong: MdastImportHandler<Strong> = (node, ctx) =>
  ctx.importChildren(node, FORMAT_BOLD);

const importDelete: MdastImportHandler = (node, ctx) =>
  ctx.importChildren(node as Strong, FORMAT_STRIKETHROUGH);

const $importBreak: MdastImportHandler = () => [$createLineBreakNode()];

const $importLink: MdastImportHandler<Link> = (node, ctx) => {
  const link = $createLinkNode(node.url, {
    title: node.title == null ? undefined : node.title,
  });
  link.append(...ctx.importChildren(node));
  return link;
};

/* -------------------------------------------------------------------------- *
 * Export handlers: Lexical node -> mdast node(s)                             *
 * -------------------------------------------------------------------------- */

const exportParagraph: MdastExportHandler = (node, ctx) => {
  if (!$isParagraphNode(node)) {
    return null;
  }
  return {
    children: ctx.exportInline(node) as PhrasingContent[],
    type: 'paragraph',
  };
};

const exportHeading: MdastExportHandler = (node, ctx) => {
  if (!$isHeadingNode(node)) {
    return null;
  }
  const depth = Math.min(
    6,
    Math.max(1, Number(node.getTag().slice(1)) || 1),
  ) as Heading['depth'];
  return {
    children: ctx.exportInline(node) as PhrasingContent[],
    depth,
    type: 'heading',
  };
};

const exportQuote: MdastExportHandler = (node, ctx) => {
  if (!$isQuoteNode(node)) {
    return null;
  }
  return {
    children: ctx.exportBlocks(node) as Blockquote['children'],
    type: 'blockquote',
  };
};

const exportCode: MdastExportHandler = node => {
  if (!$isCodeNode(node)) {
    return null;
  }
  return {
    lang: node.getLanguage() || null,
    type: 'code',
    value: node.getTextContent(),
  };
};

const exportLink: MdastExportHandler = (node, ctx) => {
  if (!$isLinkNode(node) || $isAutoLinkNode(node)) {
    return null;
  }
  return {
    children: ctx.exportInline(node) as Link['children'],
    title: node.getTitle() ?? null,
    type: 'link',
    url: node.getURL(),
  };
};

function $exportListNode(
  node: ListNode,
  ctx: Parameters<MdastExportHandler>[1],
): List {
  const listType = node.getListType();
  const list: List = {
    children: [],
    ordered: listType === 'number',
    spread: false,
    start: listType === 'number' ? node.getStart() : undefined,
    type: 'list',
  };
  let previousItem: ListItem | null = null;
  for (const child of node.getChildren()) {
    if (!$isListItemNode(child)) {
      continue;
    }
    const firstChild = child.getFirstChild();
    // A list item whose sole child is a nested list represents nesting: attach
    // the nested list to the previous item's children.
    if (child.getChildrenSize() === 1 && $isListNode(firstChild)) {
      const nested = $exportListNode(firstChild, ctx);
      if (previousItem) {
        previousItem.children.push(nested);
      } else {
        list.children.push({
          children: [nested],
          spread: false,
          type: 'listItem',
        });
      }
      continue;
    }
    const item: ListItem = {
      checked: listType === 'check' ? (child.getChecked() ?? false) : null,
      children: ctx.exportBlocks(child) as ListItem['children'],
      spread: false,
      type: 'listItem',
    };
    list.children.push(item);
    previousItem = item;
  }
  return list;
}

const $exportList: MdastExportHandler = (node, ctx) => {
  if (!$isListNode(node)) {
    return null;
  }
  return $exportListNode(node, ctx);
};

/**
 * Wraps a plain string in the mdast phrasing nodes implied by a Lexical text
 * format bitmask (code span innermost, then emphasis, strong, strikethrough).
 */
function phrasingFromFormattedText(
  value: string,
  format: number,
): PhrasingContent {
  let content: PhrasingContent =
    format & FORMAT_CODE ? {type: 'inlineCode', value} : {type: 'text', value};
  if (format & FORMAT_ITALIC) {
    content = {children: [content], type: 'emphasis'};
  }
  if (format & FORMAT_BOLD) {
    content = {children: [content], type: 'strong'};
  }
  if (format & FORMAT_STRIKETHROUGH) {
    content = {children: [content], type: 'delete'};
  }
  return content;
}

const TEXT_FORMAT_MASK =
  FORMAT_BOLD | FORMAT_ITALIC | FORMAT_STRIKETHROUGH | FORMAT_CODE;

const exportText: MdastExportHandler = node => {
  if (!$isTextNode(node)) {
    return null;
  }
  return phrasingFromFormattedText(
    node.getTextContent(),
    node.getFormat() & TEXT_FORMAT_MASK,
  );
};

const exportLineBreak: MdastExportHandler = node =>
  $isLineBreakNode(node) ? {type: 'break'} : null;

const exportTab: MdastExportHandler = node =>
  node.getType() === 'tab' ? {type: 'text', value: '\t'} : null;

/* -------------------------------------------------------------------------- *
 * Transformer bundles                                                         *
 * -------------------------------------------------------------------------- */

/**
 * CommonMark block + inline constructs that map onto Lexical's core and
 * feature nodes (paragraph, headings, block quote, lists, code, links, ...).
 * Requires no micromark extensions — `mdast-util-from-markdown` handles
 * CommonMark out of the box.
 */
export const COMMONMARK_TRANSFORMER: MdastTransformer = {
  dependencies: [HeadingNode, QuoteNode, ListNode, ListItemNode],
  exportHandlers: {
    code: exportCode,
    heading: exportHeading,
    linebreak: exportLineBreak,
    link: exportLink,
    list: $exportList,
    paragraph: exportParagraph,
    quote: exportQuote,
    tab: exportTab,
    text: exportText,
  },
  importHandlers: {
    blockquote: $importBlockquote,
    break: $importBreak,
    code: $importCode,
    emphasis: importEmphasis,
    heading: $importHeading,
    html: importHtml,
    inlineCode: importInlineCode,
    link: $importLink,
    list: $importList,
    listItem: $importListItem,
    paragraph: $importParagraph,
    strong: importStrong,
    text: importText,
  },
  name: '@lexical/mdast/commonmark',
};

/**
 * GFM `~~strikethrough~~`, mapped to Lexical's `strikethrough` text format.
 */
export const STRIKETHROUGH_TRANSFORMER: MdastTransformer = {
  importHandlers: {delete: importDelete},
  mdastExtensions: [gfmStrikethroughFromMarkdown()],
  micromarkExtensions: [gfmStrikethrough()],
  name: '@lexical/mdast/gfm-strikethrough',
  toMarkdownExtensions: [gfmStrikethroughToMarkdown()],
  // `delete` exports are produced by the core text handler's bitmask wrapping.
};

/**
 * GFM task list items (`- [x]`), mapped to Lexical check lists. The list type
 * and per-item `checked` state are handled by the CommonMark list handlers,
 * so this transformer only wires up the parser/serializer extension.
 */
export const TASK_LIST_TRANSFORMER: MdastTransformer = {
  mdastExtensions: [gfmTaskListItemFromMarkdown()],
  micromarkExtensions: [gfmTaskListItem()],
  name: '@lexical/mdast/gfm-task-list',
  toMarkdownExtensions: [gfmTaskListItemToMarkdown()],
};

/**
 * GFM literal autolinks (bare URLs become links on import).
 */
export const AUTOLINK_TRANSFORMER: MdastTransformer = {
  mdastExtensions: [gfmAutolinkLiteralFromMarkdown()],
  micromarkExtensions: [gfmAutolinkLiteral()],
  name: '@lexical/mdast/gfm-autolink',
  toMarkdownExtensions: [gfmAutolinkLiteralToMarkdown()],
};

/**
 * The default transformer set: CommonMark plus the lightweight GFM features
 * (strikethrough, task lists, autolinks) that map onto existing Lexical nodes
 * without pulling in additional node packages. Add {@link TABLE_TRANSFORMER}
 * for GFM tables.
 */
export const TRANSFORMERS: MdastTransformer[] = [
  COMMONMARK_TRANSFORMER,
  STRIKETHROUGH_TRANSFORMER,
  TASK_LIST_TRANSFORMER,
  AUTOLINK_TRANSFORMER,
];

export {phrasingFromFormattedText, TEXT_FORMAT_MASK};
