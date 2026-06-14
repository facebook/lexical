/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, ParagraphNode} from 'lexical';

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
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  $removeSlot,
  $setSlot,
  configExtension,
  defineExtension,
} from 'lexical';

import {$createCardNode} from '../plugins/CardExtension/CardNode';
import {$createPullQuoteNode} from '../plugins/PullQuoteExtension/PullQuoteNode';
import {$createReviewNode} from '../plugins/ReviewExtension/ReviewNode';
import {parseAllowedFontSize} from '../plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from '../ui/ColorPicker';
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
 * Build a single-line slot value from imported content: a bare paragraph
 * whose children are the inline projection of `nodes`. Mirrors core's
 * `<input>` analogy for block slot values (the flattening
 * `RangeSelection.insertNodes` applies when pasting into one): recurse into
 * non-inline elements for their inline children, strip line breaks, and drop
 * block-only decorators — they have no single-line form.
 */
function $createLineSlotValue(nodes: LexicalNode[]): ParagraphNode {
  const line = $createParagraphNode();
  const appendInline = (children: LexicalNode[]): void => {
    for (const node of children) {
      if ($isLineBreakNode(node)) {
        continue;
      }
      if (
        ($isElementNode(node) || $isDecoratorNode(node)) &&
        !node.isInline()
      ) {
        if ($isElementNode(node)) {
          appendInline(node.getChildren());
        }
        continue;
      }
      line.append(node);
    }
  };
  appendInline(nodes);
  return line;
}

/**
 * Reconstruct a {@link CardNode} from its exported HTML. `CardNode.exportDOM`
 * emits the named title slot as a `<div data-lexical-slot="title">` child and
 * the body as regular paragraph siblings (Card is an ElementNode host with
 * children, so body serializes through the normal child path). This rule
 * re-attaches the title via `setSlot` and appends every other direct child as
 * a regular Card child. The title is a single-line slot whose value is a bare
 * paragraph (no container wrapper), so the wrapper's imported content is
 * flattened to its inline projection. Slots are intentionally NOT
 * auto-imported (mirroring the export side and NodeState) — a host opts in
 * with a rule.
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
          $createLineSlotValue(ctx.$importChildren(domChild)),
        );
        continue;
      }
      for (const node of ctx.$importOne(domChild)) {
        card.append(node);
      }
    }
    if (!importedTitle) {
      // No title wrapper in the source HTML: the title slot value is already
      // an empty paragraph ($createCardNode seeds no text — the hint is a CSS
      // placeholder), but clear it defensively so the import can never carry
      // over fabricated content.
      const title = $getSlot(card, 'title');
      if ($isElementNode(title)) {
        title.clear();
      }
    }
    return [card];
  },
  match: sel.tag('div').classAll('lexical-card-node'),
  name: '@lexical/playground/card',
});

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
 * `<div data-lexical-slot="attribution">`. The quote is multi-block, so it
 * becomes a SlotContainerNode seeded with the imported children; the
 * attribution is a single-line slot whose value is a bare paragraph holding
 * the inline projection of the wrapper's content.
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
      if (slotName === 'quote') {
        $setSlot(
          pullquote,
          slotName,
          $createSlotContainerNode().append(...ctx.$importChildren(domChild)),
        );
      } else if (slotName === 'attribution') {
        $setSlot(
          pullquote,
          slotName,
          $createLineSlotValue(ctx.$importChildren(domChild)),
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
 * Reconstruct a {@link ReviewNode} from its exported HTML. Mirrors
 * `ReviewNode.exportDOM`: a `<div class="lexical-review-node" data-rating="N">`
 * wrapping a `<div data-lexical-slot="author">` and the body prose as regular
 * paragraph siblings (Review is an ElementNode host with children, like the
 * Card). The author is a single-line slot whose value is a bare paragraph, so
 * the wrapper's imported content is flattened to its inline projection; the
 * body children import through the normal child path. The `rating` is NodeState
 * (not a child or slot), so it is restored from the `data-rating` attribute and
 * clamped to 0–5 so hand-authored HTML can't push it out of range.
 */
const ReviewImportRule = /* @__PURE__ */ defineImportRule({
  $import: (ctx, el) => {
    const review = $createReviewNode();
    // Clear the seeded default body paragraph so imported children replace it.
    for (const child of review.getChildren()) {
      child.remove();
    }
    const rating = Number(el.getAttribute('data-rating'));
    if (Number.isFinite(rating)) {
      review.setRating(Math.max(0, Math.min(5, Math.round(rating))));
    }
    let importedAuthor = false;
    for (const domChild of Array.from(el.children)) {
      const slotName = domChild.getAttribute('data-lexical-slot');
      if (slotName === 'author') {
        importedAuthor = true;
        $setSlot(
          review,
          'author',
          $createLineSlotValue(ctx.$importChildren(domChild)),
        );
        continue;
      }
      for (const node of ctx.$importOne(domChild)) {
        review.append(node);
      }
    }
    if (!importedAuthor) {
      // No author wrapper in the source HTML: clear the seeded empty paragraph
      // defensively so the import can never carry over fabricated content.
      const author = $getSlot(review, 'author');
      if ($isElementNode(author)) {
        author.clear();
      }
    }
    return [review];
  },
  match: sel.tag('div').classAll('lexical-review-node'),
  name: '@lexical/playground/review-host',
});

/**
 * Rich-text-only playground import rules. `PlaygroundNodes` registers
 * `CardNode`/`PullQuoteNode`/`ReviewNode` in every mode, so this is not about
 * unregistered nodes: the rules live with {@link PlaygroundRichTextImportExtension}
 * so they ride the same mode gate as the other block-level import rules —
 * plain-text paste never reconstructs block hosts, so carrying these rules
 * there would be dead weight.
 */
export const PlaygroundRichTextImportRules = [
  CardImportRule,
  PullQuoteImportRule,
  ReviewImportRule,
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
        rules: PlaygroundRichTextImportRules,
      }),
    ],
    name: '@lexical/playground/RichTextImport',
  });
