/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MdastExportHandler, MdastImportHandler} from './types';
import type {ListItemNode, ListNode, ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';
import type {LexicalNode} from 'lexical';
import type {
  Blockquote,
  Break,
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
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getState,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  $setState,
  TEXT_TYPE_TO_FORMAT,
} from 'lexical';

import {
  codeFenceState,
  emphasisMarkerState,
  hardLineBreakState,
  listMarkerState,
  orderedMarkerState,
  setextState,
  strongMarkerState,
} from './state';

/** Reads the first source character of `node` (an inline delimiter, if any). */
function inlineMarker(
  ctx: Parameters<MdastImportHandler>[1],
  node: {position?: {start: {offset?: number}}},
): string | undefined {
  if (!ctx.source || !node.position || node.position.start.offset == null) {
    return undefined;
  }
  return ctx.source[node.position.start.offset];
}

const FORMAT_BOLD = TEXT_TYPE_TO_FORMAT.bold;
const FORMAT_ITALIC = TEXT_TYPE_TO_FORMAT.italic;
const FORMAT_STRIKETHROUGH = TEXT_TYPE_TO_FORMAT.strikethrough;
const FORMAT_CODE = TEXT_TYPE_TO_FORMAT.code;

export const TEXT_FORMAT_MASK =
  FORMAT_BOLD | FORMAT_ITALIC | FORMAT_STRIKETHROUGH | FORMAT_CODE;

/* -------------------------------------------------------------------------- *
 * Import handlers: mdast node -> Lexical node(s)                              *
 * -------------------------------------------------------------------------- */

export const $importParagraph: MdastImportHandler<Paragraph> = (node, ctx) => {
  const paragraph = $createParagraphNode();
  paragraph.append(...ctx.importChildren(node));
  return paragraph;
};

export const $importHeading: MdastImportHandler<Heading> = (node, ctx) => {
  const heading = $createHeadingNode(`h${node.depth}` as HeadingTagType);
  // A level 1/2 heading with no leading `#` was written in setext style.
  if (ctx.source && node.position && (node.depth === 1 || node.depth === 2)) {
    const offset = node.position.start.offset;
    if (
      offset != null &&
      !/^\s{0,3}#/.test(ctx.source.slice(offset, offset + 8))
    ) {
      $setState(heading, setextState, true);
    }
  }
  heading.append(...ctx.importChildren(node));
  return heading;
};

export const $importBlockquote: MdastImportHandler<Blockquote> = (
  node,
  ctx,
) => {
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

export const $importList: MdastImportHandler<List> = (node, ctx) => {
  const listType = $listTypeFromMdast(node);
  const start = node.ordered && node.start != null ? node.start : 1;
  const list = $createListNode(listType, start);
  // Preserve the literal marker the list used so export can reproduce it. Only
  // non-default markers are stored, to keep the serialized state minimal.
  const firstItem = node.children[0];
  const itemOffset =
    ctx.source && firstItem && firstItem.position
      ? firstItem.position.start.offset
      : undefined;
  if (itemOffset != null) {
    const rest = ctx.source.slice(itemOffset);
    if (listType === 'number') {
      const match = rest.match(/^\s*\d+([.)])/);
      if (match && match[1] === ')') {
        $setState(list, orderedMarkerState, ')');
      }
    } else {
      const match = rest.match(/^\s*([-*+])/);
      if (match && match[1] !== '-') {
        $setState(list, listMarkerState, match[1]);
      }
    }
  }
  for (const child of node.children) {
    list.append(...ctx.importNode(child));
  }
  return list;
};

export const $importListItem: MdastImportHandler<ListItem> = (node, ctx) => {
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

export const $importCode: MdastImportHandler<Code> = (node, ctx) => {
  const code = $createCodeNode(node.lang || undefined);
  // Preserve the literal fence (e.g. ``` vs ~~~ vs ````) for round-tripping.
  if (ctx.source && node.position) {
    const offset = node.position.start.offset;
    const match =
      offset == null
        ? null
        : ctx.source.slice(offset).match(/^[ \t]*(`{3,}|~{3,})/);
    if (match && match[1] !== '```') {
      $setState(code, codeFenceState, match[1]);
    }
  }
  if (node.value) {
    code.append($createTextNode(node.value));
  }
  return code;
};

export const importText: MdastImportHandler<MdastText> = (node, ctx) =>
  ctx.createText(node.value);

export const importHtml: MdastImportHandler<Html> = (node, ctx) =>
  ctx.createText(node.value);

export const importInlineCode: MdastImportHandler<InlineCode> = (node, ctx) =>
  ctx.createText(node.value, ctx.format | FORMAT_CODE);

export const $importEmphasis: MdastImportHandler<Emphasis> = (node, ctx) => {
  const children = ctx.importChildren(node, FORMAT_ITALIC);
  // Record an underscore marker (`_em_`); `*` is the default and isn't stored.
  if (inlineMarker(ctx, node) === '_') {
    for (const child of children) {
      if ($isTextNode(child)) {
        $setState(child, emphasisMarkerState, '_');
      }
    }
  }
  return children;
};

export const $importStrong: MdastImportHandler<Strong> = (node, ctx) => {
  const children = ctx.importChildren(node, FORMAT_BOLD);
  // Record an underscore marker (`__b__`); `*` is the default and isn't stored.
  if (inlineMarker(ctx, node) === '_') {
    for (const child of children) {
      if ($isTextNode(child)) {
        $setState(child, strongMarkerState, '_');
      }
    }
  }
  return children;
};

export const importDelete: MdastImportHandler = (node, ctx) =>
  ctx.importChildren(node as Strong, FORMAT_STRIKETHROUGH);

export const $importBreak: MdastImportHandler<Break> = (node, ctx) => {
  const lineBreak = $createLineBreakNode();
  // Preserve whether the hard break was written as `\` or as trailing spaces.
  if (ctx.source && node.position) {
    const {start, end} = node.position;
    if (start.offset != null && end.offset != null) {
      const raw = ctx.source.slice(start.offset, end.offset).replace(/\n$/, '');
      const marker = raw === '\\' ? '\\' : /^ {2,}$/.test(raw) ? raw : '';
      if (marker) {
        $setState(lineBreak, hardLineBreakState, marker);
      }
    }
  }
  return [lineBreak];
};

export const $importLink: MdastImportHandler<Link> = (node, ctx) => {
  const link = $createLinkNode(node.url, {
    title: node.title == null ? undefined : node.title,
  });
  link.append(...ctx.importChildren(node));
  return link;
};

/* -------------------------------------------------------------------------- *
 * Export handlers: Lexical node -> mdast node(s)                             *
 * -------------------------------------------------------------------------- */

export const exportParagraph: MdastExportHandler = (node, ctx) => {
  if (!$isParagraphNode(node)) {
    return null;
  }
  return {
    children: ctx.exportInline(node) as PhrasingContent[],
    type: 'paragraph',
  };
};

export const $exportHeading: MdastExportHandler = (node, ctx) => {
  if (!$isHeadingNode(node)) {
    return null;
  }
  const depth = Math.min(
    6,
    Math.max(1, Number(node.getTag().slice(1)) || 1),
  ) as Heading['depth'];
  return {
    children: ctx.exportInline(node) as PhrasingContent[],
    data: {mdastSetext: $getState(node, setextState)},
    depth,
    type: 'heading',
  } as Heading;
};

export const exportQuote: MdastExportHandler = (node, ctx) => {
  if (!$isQuoteNode(node)) {
    return null;
  }
  return {
    children: ctx.exportBlocks(node) as Blockquote['children'],
    type: 'blockquote',
  };
};

export const $exportCode: MdastExportHandler = node => {
  if (!$isCodeNode(node)) {
    return null;
  }
  // `data.mdastFence` is read back by the exporter's to-markdown wrapper.
  return {
    data: {mdastFence: $getState(node, codeFenceState)},
    lang: node.getLanguage() || null,
    type: 'code',
    value: node.getTextContent(),
  } as Code;
};

export const exportLink: MdastExportHandler = (node, ctx) => {
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
  // Preserve the marker the list used; read back by the exporter's to-markdown
  // wrapper.
  const listData = list as List & {
    data?: {mdastBullet?: string; mdastBulletOrdered?: string};
  };
  if (listType === 'number') {
    listData.data = {mdastBulletOrdered: $getState(node, orderedMarkerState)};
  } else {
    listData.data = {mdastBullet: $getState(node, listMarkerState)};
  }
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

export const $exportList: MdastExportHandler = (node, ctx) => {
  if (!$isListNode(node)) {
    return null;
  }
  return $exportListNode(node, ctx);
};

/**
 * Wraps a plain string in the mdast phrasing nodes implied by a Lexical text
 * format bitmask (code span innermost, then emphasis, strong, strikethrough).
 * The emphasis/strong *delimiter* (`*` vs `_`) is a document-level to-markdown
 * option (see the exporter) rather than per-node, because mixing delimiters in
 * one document desyncs to-markdown's character escaping.
 */
export function phrasingFromFormattedText(
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

export const exportText: MdastExportHandler = node => {
  if (!$isTextNode(node)) {
    return null;
  }
  return phrasingFromFormattedText(
    node.getTextContent(),
    node.getFormat() & TEXT_FORMAT_MASK,
  );
};

export const $exportLineBreak: MdastExportHandler = node =>
  $isLineBreakNode(node)
    ? ({
        data: {mdastBreak: $getState(node, hardLineBreakState)},
        type: 'break',
      } as Break)
    : null;

export const exportTab: MdastExportHandler = node =>
  node.getType() === 'tab' ? {type: 'text', value: '\t'} : null;
