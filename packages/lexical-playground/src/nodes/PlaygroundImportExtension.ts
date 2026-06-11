/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMPreprocessFn} from '@lexical/html';
import type {LexicalNode} from 'lexical';

import {ClipboardDOMImportExtension} from '@lexical/clipboard';
import {CodeImportExtension} from '@lexical/code-core';
import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  HorizontalRuleImportExtension,
  sel,
} from '@lexical/html';
import {LinkExtension} from '@lexical/link';
import {ListImportExtension} from '@lexical/list';
import {RichTextImportExtension} from '@lexical/rich-text';
import {TableImportExtension} from '@lexical/table';
import {
  $createParagraphNode,
  $getSlot,
  $isElementNode,
  $isTextNode,
  $removeSlot,
  $setSlot,
  configExtension,
  defineExtension,
  isDOMDocumentNode,
  isHTMLElement,
} from 'lexical';

import {parseAllowedFontSize} from '../plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from '../ui/ColorPicker';
import {$createCardNode} from './CardNode';
import {$createPullQuoteNode} from './PullQuoteNode';
import {$createSlotContainerNode} from './SlotContainerNode';

function getPlaygroundExtraStyles(element: HTMLElement): string {
  // Parse styles from pasted input, but only if they match exactly the
  // sort of styles that would be produced by exportDOM
  let extraStyles = '';
  const fontSize = parseAllowedFontSize(element.style.fontSize);
  const backgroundColor = parseAllowedColor(element.style.backgroundColor);
  const color = parseAllowedColor(element.style.color);
  if (fontSize !== '' && fontSize !== '15px') {
    extraStyles += `font-size: ${fontSize};`;
  }
  if (backgroundColor !== '' && backgroundColor !== 'rgb(255, 255, 255)') {
    extraStyles += `background-color: ${backgroundColor};`;
  }
  if (color !== '' && color !== 'rgb(0, 0, 0)') {
    extraStyles += `color: ${color};`;
  }
  return extraStyles;
}

function $appendStyleToTextDescendants(
  node: LexicalNode,
  extraStyle: string,
): void {
  if ($isTextNode(node)) {
    node.setStyle(node.getStyle() + extraStyle);
  } else if ($isElementNode(node)) {
    for (const child of node.getChildren()) {
      $appendStyleToTextDescendants(child, extraStyle);
    }
  }
}

/**
 * Mirrors the legacy `buildHTMLConfig`-time wrapping of TextNode importers:
 * for any inline-format element (b/code/em/i/mark/s/span/strong/sub/sup/u),
 * if the element carries playground-allowed inline styles
 * (`font-size`, `background-color`, `color`), append those to the inline
 * style of every TextNode descendant produced by the lower-priority
 * `InlineFormatRule`.
 */
const PlaygroundInlineStyleRule = /* @__PURE__ */ defineImportRule({
  $import: (_ctx, el, $next) => {
    const extraStyle = getPlaygroundExtraStyles(el);
    const result = $next();
    if (extraStyle) {
      for (const node of result) {
        $appendStyleToTextDescendants(node, extraStyle);
      }
    }
    return result;
  },
  match: sel.tag(
    'b',
    'code',
    'em',
    'i',
    'mark',
    's',
    'span',
    'strong',
    'sub',
    'sup',
    'u',
  ),
  name: '@lexical/playground/inline-extra-styles',
});

/**
 * Reconstruct a {@link CardNode} from its exported HTML. `CardNode.exportDOM`
 * emits the named title slot as a `<div data-lexical-slot="title">` child and
 * the body as regular paragraph siblings (Card is an ElementNode host with
 * children, so body serializes through the normal child path). This rule
 * re-attaches the title via `setSlot` and appends every other direct child as
 * a regular Card child. Slots are intentionally NOT auto-imported (mirroring
 * the export side and NodeState) — a host opts in with a rule.
 */
const CardImportRule = /* @__PURE__ */ defineImportRule({
  $import: (ctx, el) => {
    const card = $createCardNode();
    // Clear the seeded default body paragraph so imported children replace it.
    for (const child of card.getChildren()) {
      child.remove();
    }
    let importedTitle = false;
    for (const domChild of Array.from(el.children)) {
      const slotName = domChild.getAttribute('data-lexical-slot');
      if (slotName === 'title') {
        importedTitle = true;
        $setSlot(
          card,
          'title',
          $createSlotContainerNode().append(...ctx.$importChildren(domChild)),
        );
        continue;
      }
      for (const node of ctx.$importOne(domChild)) {
        card.append(node);
      }
    }
    if (!importedTitle) {
      // No title wrapper in the source HTML: drop the seeded "Title" text
      // (keeping an empty paragraph) so the import never fabricates content —
      // mirrors PullQuoteImportRule's explicit seed-clearing.
      const title = $getSlot(card, 'title');
      if ($isElementNode(title)) {
        title.clear().append($createParagraphNode());
      }
    }
    return [card];
  },
  match: sel.tag('div').classAll('lexical-card-node'),
  name: '@lexical/playground/card',
});

/**
 * A browser's contenteditable Cmd+A → Cmd+C strips the outer
 * `<div class="lexical-card-node">` / `<div class="lexical-pullquote-node">`
 * wrapper that the host's exportDOM emits, leaving the
 * `<div data-lexical-slot="...">` children as fragment-root siblings.
 * Re-assemble them under a synthetic host div before the import walk so
 * CardImportRule / PullQuoteImportRule pick them up and the slot HTML
 * round-trip closes through external paste targets too.
 *
 * Two host shapes are handled in one pass over the fragment-root children:
 * - A Card group is opened by a `data-lexical-slot="title"` wrapper and
 *   absorbs every following non-slot sibling as Card body until the next
 *   slot wrapper closes the group. Two title wrappers in a row become two
 *   distinct Card groups (a single group would make CardImportRule's second
 *   `$setSlot(card, 'title', ...)` silently detach the first title).
 * - A PullQuote group is opened by a `data-lexical-slot="quote"` wrapper
 *   and absorbs the immediately following `data-lexical-slot="attribution"`
 *   if present. PullQuote is a DecoratorNode-as-host with no children
 *   channel, so other siblings would pull unrelated paste content into it.
 */
const $rewrapOrphanedSlotWrappers: DOMPreprocessFn = (dom, _ctx, $next) => {
  const doc = isDOMDocumentNode(dom) ? dom : dom.ownerDocument;
  if (doc !== null) {
    const root: ParentNode = isDOMDocumentNode(dom) ? dom.body : dom;
    type Group = {
      kind: 'card' | 'pullquote';
      members: Element[];
      anchor: Element;
    };
    const groups: Group[] = [];
    let openCard: Group | null = null;
    let openPullQuote: Group | null = null;
    for (const child of Array.from(root.children)) {
      if (!isHTMLElement(child)) {
        // A non-element root sibling closes the current runs — we can't
        // safely fold it (it's not part of the host's exported shape) and
        // letting a run cross it would absorb unrelated content.
        openCard = null;
        openPullQuote = null;
        continue;
      }
      const slotName = child.getAttribute('data-lexical-slot');
      if (slotName === 'title') {
        openCard = {anchor: child, kind: 'card', members: [child]};
        openPullQuote = null;
        groups.push(openCard);
      } else if (slotName === 'quote') {
        openPullQuote = {
          anchor: child,
          kind: 'pullquote',
          members: [child],
        };
        openCard = null;
        groups.push(openPullQuote);
      } else if (slotName === 'attribution') {
        // Only absorb attribution when a PullQuote is open; an orphan
        // attribution wrapper with no preceding `quote` is dropped (it
        // shouldn't leak into an unrelated Card body below) and closes any
        // open Card run — later siblings must not reorder into it across
        // the dropped wrapper.
        if (openPullQuote !== null) {
          openPullQuote.members.push(child);
        } else {
          openCard = null;
        }
      } else if (slotName !== null) {
        // Any other orphan slot wrapper closes the open runs for the same
        // reason; it is not part of either host's exported shape.
        openCard = null;
        openPullQuote = null;
      } else if (openCard !== null) {
        openCard.members.push(child);
      }
    }
    for (const group of groups) {
      const hostDiv = doc.createElement('div');
      hostDiv.className =
        group.kind === 'card' ? 'lexical-card-node' : 'lexical-pullquote-node';
      group.anchor.parentNode?.insertBefore(hostDiv, group.anchor);
      for (const member of group.members) {
        hostDiv.appendChild(member);
      }
    }
  }
  $next();
};

/**
 * Mode-independent playground DOM import rules — currently just the
 * inline extra-styles overlay. The Card / PullQuote host rules are
 * rich-text-only and live in {@link PlaygroundRichTextImportRules}.
 */
export const PlaygroundImportRules = [PlaygroundInlineStyleRule];

/**
 * Reconstruct a {@link PullQuoteNode} from its exported HTML. Mirrors
 * `PullQuoteNode.exportDOM`: a `<div class="lexical-pullquote-node">`
 * wrapping `<div data-lexical-slot="quote">` and
 * `<div data-lexical-slot="attribution">`, both of which become
 * SlotContainerNodes seeded with the imported children.
 *
 * `$createPullQuoteNode` seeds both slots with default text — we drop both
 * seeds before walking the imported wrappers so an HTML fragment that's
 * missing one of the slots can't silently inherit the default text. Mirrors
 * the explicit "clear seeded children" step CardImportRule does above.
 *
 * The host is a DecoratorNode with no children channel, so direct children
 * that aren't slot wrappers land in the quote slot (created on demand)
 * rather than being dropped.
 */
const PullQuoteImportRule = /* @__PURE__ */ defineImportRule({
  $import: (ctx, el) => {
    const pullquote = $createPullQuoteNode();
    $removeSlot(pullquote, 'quote');
    $removeSlot(pullquote, 'attribution');
    const orphans: LexicalNode[] = [];
    for (const domChild of Array.from(el.children)) {
      const slotName = domChild.getAttribute('data-lexical-slot');
      if (slotName === 'quote' || slotName === 'attribution') {
        $setSlot(
          pullquote,
          slotName,
          $createSlotContainerNode().append(...ctx.$importChildren(domChild)),
        );
      } else {
        orphans.push(...ctx.$importOne(domChild));
      }
    }
    if (orphans.length > 0) {
      const existing = $getSlot(pullquote, 'quote');
      const quote = $isElementNode(existing)
        ? existing
        : $createSlotContainerNode();
      if (quote !== existing) {
        $setSlot(pullquote, 'quote', quote);
      }
      quote.append(...orphans);
    }
    return [pullquote];
  },
  match: sel.tag('div').classAll('lexical-pullquote-node'),
  name: '@lexical/playground/pullquote-host',
});

/**
 * Rich-text-only playground import rules. `PlaygroundNodes` registers
 * `CardNode`/`PullQuoteNode` in every mode, so this is not about unregistered
 * nodes: the rules live with {@link PlaygroundRichTextImportExtension} so they
 * ride the same mode gate as the other block-level import rules — plain-text
 * paste never reconstructs block hosts, so carrying these rules there would
 * be dead weight.
 */
export const PlaygroundRichTextImportRules = [
  CardImportRule,
  PullQuoteImportRule,
];

/**
 * Plain-text-safe DOM-import baseline, added in `AppExtension` so it applies in
 * every editor mode:
 *
 *  - {@link CoreImportExtension} (paragraphs, text, line breaks, generic
 *    block/inline handling)
 *  - {@link LinkExtension} (always in the playground; registers its own
 *    `<a>` import rule)
 *  - {@link ClipboardDOMImportExtension} so pastes flow through the pipeline
 *  - the playground-specific {@link PlaygroundImportRules} overlay
 *
 * The rich-text-only import rules (rich-text, list, table, code,
 * horizontal-rule) come along with the corresponding node extensions in
 * `PlaygroundRichTextExtension` — each node package registers its own
 * rules — so the importer set automatically matches the node set per
 * mode, and plain-text mode never pulls in `RichTextExtension` (which
 * *conflicts* with `PlainTextExtension`).
 */
export const PlaygroundImportExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    CoreImportExtension,
    LinkExtension,
    ClipboardDOMImportExtension,
    /* @__PURE__ */ configExtension(DOMImportExtension, {
      rules: PlaygroundImportRules,
    }),
  ],
  name: '@lexical/playground/Import',
});

/**
 * The rich-text-only per-package importers, mirroring the rich-text node set.
 * Added to `PlaygroundRichTextExtension` (not the always-on
 * {@link PlaygroundImportExtension}) so plain-text editors never pull in
 * `RichText`/`List`/`Table`/`Code`/`HorizontalRule`.
 */
export const PlaygroundRichTextImportExtension =
  /* @__PURE__ */ defineExtension({
    dependencies: [
      RichTextImportExtension,
      ListImportExtension,
      TableImportExtension,
      CodeImportExtension,
      HorizontalRuleImportExtension,
      /* @__PURE__ */ configExtension(DOMImportExtension, {
        preprocess: [$rewrapOrphanedSlotWrappers],
        rules: PlaygroundRichTextImportRules,
      }),
    ],
    name: '@lexical/playground/RichTextImport',
  });
