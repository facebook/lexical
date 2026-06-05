/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  $isElementNode,
  $isTextNode,
  configExtension,
  defineExtension,
} from 'lexical';

import {parseAllowedFontSize} from '../plugins/ToolbarPlugin/fontSize';
import {parseAllowedColor} from '../ui/ColorPicker';
import {$createCardNode} from './CardNode';
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
 * emits each named slot as a `<div data-lexical-slot="name">` child; this rule
 * imports each wrapper's contents and re-attaches them via `setSlot`, closing
 * the explicit slot HTML round-trip. Slots are intentionally NOT auto-imported
 * (mirroring the export side and NodeState) — a host opts in with a rule.
 */
const CardImportRule = defineImportRule({
  $import: (ctx, el) => {
    const card = $createCardNode();
    for (const wrapper of Array.from(
      el.querySelectorAll(':scope > [data-lexical-slot]'),
    )) {
      const name = wrapper.getAttribute('data-lexical-slot');
      if (name === null) {
        continue;
      }
      card.setSlot(
        name,
        $createSlotContainerNode().append(...ctx.$importChildren(wrapper)),
      );
    }
    return [card];
  },
  match: sel.tag('div').classAll('lexical-card-node'),
  name: '@lexical/playground/card',
});

/**
 * Aggregate of every playground-specific DOM import rule, ordered so the
 * more-specific selectors win dispatch over the generic ones (rule at
 * index 0 has the highest priority).
 */
export const PlaygroundImportRules = [PlaygroundInlineStyleRule];

/**
 * Rich-text-only playground import rules. Lives with
 * {@link PlaygroundRichTextImportExtension} so plain-text editors — which never
 * register `CardNode` — don't carry a rule that would build an unregistered
 * node.
 */
export const PlaygroundRichTextImportRules = [CardImportRule];

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
    configExtension(DOMImportExtension, {rules: PlaygroundRichTextImportRules}),
  ],
  name: '@lexical/playground/RichTextImport',
});
