/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineImportRule, DOMImportExtension, sel} from '@lexical/html';
import {
  $setDirectionFromDOM,
  $setFormatFromDOM,
  configExtension,
  defineExtension,
  isHTMLElement,
  setNodeIndentFromDOM,
} from 'lexical';

import {
  $createHeadingNode,
  $createQuoteNode,
  type HeadingTagType,
} from './index';
import {RichTextExtension} from './LexicalRichTextExtension';

/**
 * Heuristic copied (in spirit) from the legacy `isGoogleDocsTitle`:
 * Google Docs serializes the document title as a `<span style="font-size:
 * 26pt">` (sometimes wrapped in a `<p>`). The presence of a 26pt span at
 * the start of a `<p>` is treated as a heading-1 marker.
 */
function isGoogleDocsTitleSpan(node: Node): boolean {
  return (
    isHTMLElement(node) &&
    node.nodeName === 'SPAN' &&
    node.style.fontSize === '26pt'
  );
}

const HeadingRule = defineImportRule({
  $import: (ctx, el) => {
    const tag = el.nodeName.toLowerCase() as HeadingTagType;
    const node = $createHeadingNode(tag);
    setNodeIndentFromDOM(el, node);
    $setFormatFromDOM(node, el);
    $setDirectionFromDOM(node, el);
    return [node.splice(0, 0, ctx.$importChildren(el))];
  },
  match: sel.tag('h1', 'h2', 'h3', 'h4', 'h5', 'h6'),
  name: '@lexical/rich-text/heading',
});

const QuoteRule = defineImportRule({
  $import: (ctx, el) => {
    const node = $createQuoteNode();
    $setFormatFromDOM(node, el);
    setNodeIndentFromDOM(el, node);
    $setDirectionFromDOM(node, el);
    return [node.splice(0, 0, ctx.$importChildren(el))];
  },
  match: sel.tag('blockquote'),
  name: '@lexical/rich-text/blockquote',
});

/**
 * Google-Docs paragraph wrapper around a title span: drop the paragraph,
 * let the span rule below promote to a heading. The body deliberately
 * returns the children unwrapped (no schema, no own node) so the
 * descendant rules — including {@link GoogleDocsTitleSpanRule} — fire and
 * produce the heading at this level.
 */
const GoogleDocsTitleParagraphRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const first = el.firstChild;
    if (first && isGoogleDocsTitleSpan(first)) {
      return ctx.$importChildren(el);
    }
    return $next();
  },
  match: sel.tag('p'),
  name: '@lexical/rich-text/google-docs-title-p',
});

const GoogleDocsTitleSpanRule = defineImportRule({
  $import: (ctx, el, $next) =>
    el.style.fontSize !== '26pt'
      ? $next()
      : [$createHeadingNode('h1').splice(0, 0, ctx.$importChildren(el))],
  match: sel.tag('span'),
  name: '@lexical/rich-text/google-docs-title-span',
});

/**
 * Import rules for {@link HeadingNode} and {@link QuoteNode}, including
 * the Google Docs title heuristic that the legacy `HeadingNode.importDOM`
 * declared. The Google-Docs rules are registered last (highest priority)
 * so they precede the generic `<p>` and `<span>` rules from
 * {@link CoreImportRules}.
 *
 * @experimental
 */
export const RichTextImportRules = [
  HeadingRule,
  QuoteRule,
  GoogleDocsTitleParagraphRule,
  GoogleDocsTitleSpanRule,
];

/**
 * Bundles {@link RichTextImportRules} together with the runtime
 * {@link RichTextExtension}. The application is expected to already
 * have `CoreImportExtension` (or some equivalent) in its dependency
 * graph — the core/text/paragraph/inline-format rules are a shared
 * baseline, not something this leaf importer should re-declare.
 *
 * @experimental
 */
export const RichTextImportExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    configExtension(DOMImportExtension, {rules: RichTextImportRules}),
  ],
  name: '@lexical/rich-text/Import',
});
