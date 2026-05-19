/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
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
  HeadingNode,
  type HeadingTagType,
  QuoteNode,
} from './index';

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
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
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
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
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
  $import: (ctx, el, $next) => {
    if (el.style.fontSize !== '26pt') {
      return $next();
    }
    const node = $createHeadingNode('h1');
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
  },
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
 * Bundles {@link RichTextImportRules} (plus {@link CoreImportExtension})
 * into a single dependency. Use this in editors that want the legacy
 * `@lexical/rich-text` DOM import behavior under the new
 * {@link DOMImportExtension} pipeline.
 *
 * @experimental
 */
export const RichTextImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    configExtension(DOMImportExtension, {rules: RichTextImportRules}),
  ],
  name: '@lexical/rich-text/Import',
  // Register HeadingNode + QuoteNode lazily so the rules can safely call
  // $createHeadingNode / $createQuoteNode. We can't depend on
  // RichTextExtension directly because it's defined in this package's
  // ./index — that introduces a module-init cycle. Apps that want the
  // full RichTextExtension behavior (paste/cut handlers, format
  // triggers) should depend on it separately.
  nodes: () => [HeadingNode, QuoteNode],
});
