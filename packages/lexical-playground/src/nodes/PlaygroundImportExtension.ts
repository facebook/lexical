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
import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {LinkExtension} from '@lexical/link';
import {
  $isDecoratorNode,
  $isElementNode,
  $isTextNode,
  $setSlot,
  configExtension,
  defineExtension,
  isDOMDocumentNode,
  isHTMLElement,
} from 'lexical';

import {parseAllowedFontSize} from '../plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from '../ui/ColorPicker';
import {$createCardNode} from './CardNode';
import {$createFigureNode} from './FigureNode';
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
const CardImportRule = defineImportRule({
  $import: (ctx, el) => {
    const card = $createCardNode();
    // Clear the seeded default body paragraph so imported children replace it.
    for (const child of card.getChildren()) {
      child.remove();
    }
    for (const domChild of Array.from(el.children)) {
      const slotName = domChild.getAttribute('data-lexical-slot');
      if (slotName === 'title') {
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
    return [card];
  },
  match: sel.tag('div').classAll('lexical-card-node'),
  name: '@lexical/playground/card',
});

/**
 * A browser's contenteditable Cmd+A → Cmd+C strips the outer
 * `<div class="lexical-card-node">` / `<div class="lexical-figure-node">`
 * wrapper that the host's exportDOM emits, leaving the
 * `<div data-lexical-slot="...">` children as fragment-root siblings.
 * Re-assemble them under a synthetic host div before the import walk so
 * CardImportRule / FigureImportRule pick them up and the slot HTML round-trip
 * closes through external paste targets too.
 *
 * Two host shapes are handled in one pass over the fragment-root children:
 * - A Card group is opened by a `data-lexical-slot="title"` wrapper and
 *   absorbs every following non-slot sibling as Card body until the next
 *   slot wrapper closes the group. Two title wrappers in a row become two
 *   distinct Card groups (a single group would make CardImportRule's second
 *   `$setSlot(card, 'title', ...)` silently detach the first title).
 * - A Figure group is just the single `data-lexical-slot="media"` wrapper.
 *   Figure is a DecoratorNode-as-host with no children channel, so absorbing
 *   following siblings would pull unrelated paste content into it.
 */
const $rewrapOrphanedSlotWrappers: DOMPreprocessFn = (dom, _ctx, $next) => {
  const doc = isDOMDocumentNode(dom) ? dom : dom.ownerDocument;
  if (doc !== null) {
    const root: ParentNode = isDOMDocumentNode(dom) ? dom.body : dom;
    type Group = {
      kind: 'card' | 'figure';
      members: Element[];
      anchor: Element;
    };
    const groups: Group[] = [];
    let openCard: Group | null = null;
    for (const child of Array.from(root.children)) {
      if (!isHTMLElement(child)) {
        // A non-element root sibling closes the current Card run — we can't
        // safely fold it (it's not part of the host's exported shape) and
        // letting the run cross it would absorb unrelated content.
        openCard = null;
        continue;
      }
      const slotName = child.getAttribute('data-lexical-slot');
      if (slotName === 'title') {
        openCard = {anchor: child, kind: 'card', members: [child]};
        groups.push(openCard);
      } else if (slotName === 'media') {
        openCard = null;
        groups.push({anchor: child, kind: 'figure', members: [child]});
      } else if (openCard !== null) {
        openCard.members.push(child);
      }
    }
    for (const group of groups) {
      const hostDiv = doc.createElement('div');
      hostDiv.className =
        group.kind === 'card' ? 'lexical-card-node' : 'lexical-figure-node';
      group.anchor.parentNode?.insertBefore(hostDiv, group.anchor);
      for (const member of group.members) {
        hostDiv.appendChild(member);
      }
    }
  }
  $next();
};

/**
 * Aggregate of every playground-specific DOM import rule, ordered so the
 * more-specific selectors win dispatch over the generic ones (rule at
 * index 0 has the highest priority).
 */
export const PlaygroundImportRules = [PlaygroundInlineStyleRule];

/**
 * Reconstruct a {@link FigureNode} from its exported HTML. Mirrors
 * `FigureNode.exportDOM`: a `<div class="lexical-figure-node">` wrapping a
 * single `<div data-lexical-slot="media">` whose child is the imported
 * EquationNode (via EquationNode.importDOM). The default Equation seeded by
 * `$createFigureNode` is replaced via `$setSlot` once the imported slot value
 * arrives. Slots are intentionally NOT auto-imported (mirroring the export
 * side and NodeState) — a host opts in with a rule.
 */
const FigureImportRule = defineImportRule({
  $import: (ctx, el) => {
    const figure = $createFigureNode();
    for (const wrapper of Array.from(
      el.querySelectorAll(':scope > [data-lexical-slot]'),
    )) {
      if (wrapper.getAttribute('data-lexical-slot') !== 'media') {
        continue;
      }
      // setSlot requires a non-inline DecoratorNode for the `media` slot
      // value; pick the first imported child that satisfies the same guard.
      const slotValue = ctx
        .$importChildren(wrapper)
        .find(node => $isDecoratorNode(node) && !node.isInline());
      if (slotValue !== undefined) {
        $setSlot(figure, 'media', slotValue);
      }
    }
    return [figure];
  },
  match: sel.tag('div').classAll('lexical-figure-node'),
  name: '@lexical/playground/figure-host',
});

/**
 * Rich-text-only playground import rules. Lives with
 * {@link PlaygroundRichTextImportExtension} so plain-text editors — which never
 * register `CardNode`/`FigureNode` — don't carry a rule that would build an
 * unregistered node.
 */
export const PlaygroundRichTextImportRules = [CardImportRule, FigureImportRule];

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
export const PlaygroundRichTextImportExtension = defineExtension({
  dependencies: [
    RichTextImportExtension,
    ListImportExtension,
    TableImportExtension,
    CodeImportExtension,
    HorizontalRuleImportExtension,
    configExtension(DOMImportExtension, {
      preprocess: [$rewrapOrphanedSlotWrappers],
      rules: PlaygroundRichTextImportRules,
    }),
  ],
  name: '@lexical/playground/RichTextImport',
});
