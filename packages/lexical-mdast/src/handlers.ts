/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  MdastExportHandler,
  MdastImportContext,
  MdastImportHandler,
  MdastParent,
} from './types';
import type {ListItemNode, ListNode, ListType} from '@lexical/list';
import type {HeadingTagType} from '@lexical/rich-text';
import type {ElementNode, LexicalNode} from 'lexical';
import type {
  Blockquote,
  Break,
  Code,
  Emphasis,
  Heading,
  Html,
  InlineCode,
  Link,
  LinkReference,
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
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  $setState,
  TEXT_TYPE_TO_FORMAT,
} from 'lexical';

import {
  codeFenceState,
  codeMetaState,
  emphasisMarkerState,
  hardLineBreakState,
  listMarkerState,
  orderedMarkerState,
  paragraphBreakState,
  setextState,
  strongMarkerState,
} from './state';

/**
 * Whether `node` is a block-level node: a non-inline element *or* a non-inline
 * decorator (e.g. a horizontal rule).
 */
export function $isBlockLevelNode(node: LexicalNode): boolean {
  return ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();
}

/** A `LineBreakNode` marking a paragraph boundary inside a container. */
function $createParagraphBreakNode(): LexicalNode {
  const lineBreak = $createLineBreakNode();
  $setState(lineBreak, paragraphBreakState, true);
  return lineBreak;
}

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
  // A level 1/2 heading that does not start with a valid ATX marker (`#`..
  // `######` followed by whitespace or end of line) was written in setext
  // style. Checking for the trailing boundary matters: `#foo\n===` is a
  // setext heading whose *content* begins with `#`.
  if (ctx.source && node.position && (node.depth === 1 || node.depth === 2)) {
    const offset = node.position.start.offset;
    if (
      offset != null &&
      !/^ {0,3}#{1,6}([ \t\r\n]|$)/.test(ctx.source.slice(offset, offset + 10))
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
        children.push($createParagraphBreakNode());
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

/**
 * Imports each mdast flow child of `parent` as block-level Lexical nodes,
 * wrapping any stray inline output (e.g. from the `html` fallback) in a
 * paragraph — the same normalization the top-level importer applies.
 */
export function $importBlockChildren(
  parent: MdastParent,
  ctx: MdastImportContext,
): LexicalNode[] {
  const blocks: LexicalNode[] = [];
  let pendingParagraph: ElementNode | null = null;
  const flushPending = () => {
    if (pendingParagraph) {
      blocks.push(pendingParagraph);
      pendingParagraph = null;
    }
  };
  for (const child of parent.children) {
    for (const node of ctx.importNode(child)) {
      if ($isBlockLevelNode(node)) {
        flushPending();
        blocks.push(node);
      } else {
        if (!pendingParagraph) {
          pendingParagraph = $createParagraphNode();
        }
        pendingParagraph.append(node);
      }
    }
  }
  flushPending();
  return blocks;
}

/**
 * Opt-in replacement for {@link $importBlockquote} that imports the quote as a
 * shadow root {@link QuoteNode} holding block-level children, so structured
 * blockquotes (multiple paragraphs, nested lists, code) round-trip without
 * being flattened to inline content. See `MdastShadowRootQuoteExtension`.
 */
export const $importShadowRootBlockquote: MdastImportHandler<Blockquote> = (
  node,
  ctx,
) => {
  const quote = $createQuoteNode({shadowRoot: true});
  quote.append(...$importBlockChildren(node as MdastParent, ctx));
  return quote;
};

/** Maps an mdast `list` node to the Lexical {@link ListType} it represents. */
export function $listTypeFromMdast(node: List): ListType {
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
  // Preserve the literal marker the list used so export can reproduce it.
  // A bounded window is enough: an ordered marker is at most 9 digits plus
  // the delimiter (CommonMark), a bullet is a single character.
  const firstItem = node.children[0];
  const itemOffset =
    ctx.source && firstItem && firstItem.position
      ? firstItem.position.start.offset
      : undefined;
  if (itemOffset != null) {
    const window = ctx.source.slice(itemOffset, itemOffset + 16);
    if (listType === 'number') {
      const match = window.match(/^\s*\d+([.)])/);
      if (match) {
        $setState(list, orderedMarkerState, match[1]);
      }
    } else {
      const match = window.match(/^\s*([-*+])/);
      if (match) {
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
        item.append($createParagraphBreakNode());
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
  // The fence is on the construct's first line; bound the scan to it.
  if (ctx.source && node.position && node.position.start.offset != null) {
    const offset = node.position.start.offset;
    const lineEnd = ctx.source.indexOf('\n', offset);
    const line = ctx.source.slice(offset, lineEnd === -1 ? undefined : lineEnd);
    const match = line.match(/^[ \t]*(`{3,}|~{3,})/);
    if (match) {
      $setState(code, codeFenceState, match[1]);
    }
  }
  // CodeNode only models the language; keep the rest of the info string
  // (` ```js title=x `) as node state so it survives the round-trip.
  if (node.meta) {
    $setState(code, codeMetaState, node.meta);
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

/**
 * Builds the emphasis/strong import handler: applies the format bit and
 * records an underscore delimiter (`_em_` / `__b__`) on the resulting text
 * nodes; `*` is the default and isn't stored.
 */
function makeEmphasisImporter(
  format: number,
  markerState: typeof emphasisMarkerState | typeof strongMarkerState,
): MdastImportHandler<Emphasis | Strong> {
  return (node, ctx) => {
    const children = ctx.importChildren(node, format);
    if (inlineMarker(ctx, node) === '_') {
      for (const child of children) {
        if ($isTextNode(child)) {
          $setState(child, markerState, '_');
        }
      }
    }
    return children;
  };
}

export const $importEmphasis: MdastImportHandler<Emphasis | Strong> =
  /* @__PURE__ */ makeEmphasisImporter(FORMAT_ITALIC, emphasisMarkerState);

export const $importStrong: MdastImportHandler<Emphasis | Strong> =
  /* @__PURE__ */ makeEmphasisImporter(FORMAT_BOLD, strongMarkerState);

export const importDelete: MdastImportHandler = (node, ctx) =>
  ctx.importChildren(node as Strong, FORMAT_STRIKETHROUGH);

export const $importBreak: MdastImportHandler<Break> = (node, ctx) => {
  const lineBreak = $createLineBreakNode();
  // An mdast `break` is always a HARD break; preserve whether it was written
  // as `\` or as trailing spaces, defaulting to `\` when the literal cannot
  // be recovered. (Soft breaks are newlines inside text values and stay
  // unmarked, serializing back to a plain newline.)
  let marker = '\\';
  if (ctx.source && node.position) {
    const {start, end} = node.position;
    if (start.offset != null && end.offset != null) {
      const raw = ctx.source.slice(start.offset, end.offset).replace(/\n$/, '');
      if (/^ {2,}$/.test(raw)) {
        marker = raw;
      }
    }
  }
  $setState(lineBreak, hardLineBreakState, marker);
  return [lineBreak];
};

export const $importLink: MdastImportHandler<Link> = (node, ctx) => {
  const link = $createLinkNode(node.url, {
    title: node.title == null ? undefined : node.title,
  });
  link.append(...ctx.importChildren(node));
  return link;
};

/**
 * CommonMark reference links (`[text][id]`, `[id][]`, `[id]`) resolve against
 * the document's definitions. An unresolved reference is literal text per the
 * spec, so it is re-emitted verbatim.
 */
export const $importLinkReference: MdastImportHandler<LinkReference> = (
  node,
  ctx,
) => {
  const definition = ctx.getDefinition(node.identifier);
  if (definition) {
    const link = $createLinkNode(definition.url, {
      title: definition.title == null ? undefined : definition.title,
    });
    link.append(...ctx.importChildren(node));
    return link;
  }
  const {position} = node;
  if (ctx.source && position && position.start.offset != null) {
    return ctx.createText(
      ctx.source.slice(position.start.offset, position.end.offset),
    );
  }
  // Approximate the literal when the source is unavailable.
  return [
    ...ctx.createText('['),
    ...ctx.importChildren(node),
    ...ctx.createText(']'),
  ];
};

/**
 * Definitions (`[id]: url "title"`) are consumed by {@link collectDefinitions}
 * before the walk; the node itself produces no content.
 */
export const importDefinition: MdastImportHandler = () => [];

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
  const heading: Heading = {
    children: ctx.exportInline(node) as PhrasingContent[],
    depth,
    type: 'heading',
  };
  // Only pin the style when it is known; nodes created in the editor defer
  // to the document-level serialization options.
  if ($getState(node, setextState)) {
    heading.data = {mdastSetext: true} as Heading['data'];
  }
  return heading;
};

export const exportQuote: MdastExportHandler = (node, ctx) => {
  if (!$isQuoteNode(node)) {
    return null;
  }
  // A shadow root quote holds block-level children that dispatch directly;
  // a legacy quote holds inline content that must be reassembled into
  // paragraphs. Branching per node lets both forms coexist in one document.
  return {
    children: (node.isShadowRoot()
      ? ctx.exportChildren(node)
      : ctx.exportBlocks(node)) as Blockquote['children'],
    type: 'blockquote',
  };
};

export const $exportCode: MdastExportHandler = node => {
  if (!$isCodeNode(node)) {
    return null;
  }
  const code: Code = {
    lang: node.getLanguage() || null,
    type: 'code',
    value: node.getTextContent(),
  };
  // The info-string tail is a first-class mdast field; to-markdown emits it
  // after the language (and forces fenced style).
  const meta = $getState(node, codeMetaState);
  if (meta) {
    code.meta = meta;
  }
  // `data.mdastFence` is read back by the exporter's to-markdown wrapper.
  // Only pin the fence when known; editor-created code blocks defer to the
  // document-level serialization options.
  const fence = $getState(node, codeFenceState);
  if (fence) {
    code.data = {mdastFence: fence} as Code['data'];
  }
  return code;
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
  // Preserve the marker the list used; read back by the exporter's
  // to-markdown wrapper. Only pinned when known — editor-created lists defer
  // to the document-level serialization options.
  const listData = list as List & {
    data?: {mdastBullet?: string; mdastBulletOrdered?: string};
  };
  if (listType === 'number') {
    const marker = $getState(node, orderedMarkerState);
    if (marker) {
      listData.data = {mdastBulletOrdered: marker};
    }
  } else {
    const marker = $getState(node, listMarkerState);
    if (marker) {
      listData.data = {mdastBullet: marker};
    }
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
