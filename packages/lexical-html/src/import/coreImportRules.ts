/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $setDirectionFromDOM,
  $setFormatFromDOM,
  type ElementFormatType,
  IS_BOLD,
  IS_CODE,
  IS_HIGHLIGHT,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_SUBSCRIPT,
  IS_SUPERSCRIPT,
  IS_UNDERLINE,
  isDOMTextNode,
  isHTMLElement,
  type LexicalNode,
  setNodeIndentFromDOM,
} from 'lexical';

import {contextValue} from '../ContextRecord';
import {defineImportRule} from './defineImportRule';
import {ImportTextFormat} from './ImportContext';
import {selBase} from './sel';

const sel = selBase;

const ALIGNMENT_VALUES: ReadonlySet<ElementFormatType> =
  new Set<ElementFormatType>([
    'center',
    'end',
    'justify',
    'left',
    'right',
    'start',
  ]);

/**
 * Combine the format bits implied by inline `style` properties (Google
 * Docs-style markup) with `extra`, returning the new TextFormatType
 * bitmask to install into {@link ImportTextFormat} while descending into
 * the element's children.
 */
function styleFormatBits(style: CSSStyleDeclaration): number {
  let bits = 0;
  const fontWeight = style.fontWeight;
  if (fontWeight === '700' || fontWeight === 'bold') {
    bits |= IS_BOLD;
  }
  if (style.fontStyle === 'italic') {
    bits |= IS_ITALIC;
  }
  const textDecoration = style.textDecoration.split(' ');
  if (textDecoration.includes('underline')) {
    bits |= IS_UNDERLINE;
  }
  if (textDecoration.includes('line-through')) {
    bits |= IS_STRIKETHROUGH;
  }
  const verticalAlign = style.verticalAlign;
  if (verticalAlign === 'sub') {
    bits |= IS_SUBSCRIPT;
  } else if (verticalAlign === 'super') {
    bits |= IS_SUPERSCRIPT;
  }
  return bits;
}

const NODE_NAME_TO_FORMAT: Record<string, number> = {
  CODE: IS_CODE,
  EM: IS_ITALIC,
  I: IS_ITALIC,
  MARK: IS_HIGHLIGHT,
  S: IS_STRIKETHROUGH,
  STRONG: IS_BOLD,
  SUB: IS_SUBSCRIPT,
  SUP: IS_SUPERSCRIPT,
  U: IS_UNDERLINE,
};

/**
 * Inline formatting tags (`<strong>`, `<em>`, `<i>`, `<code>`, `<mark>`,
 * `<s>`, `<sub>`, `<sup>`, `<u>`). Each pushes its associated format bit
 * plus any CSS-derived bits into {@link ImportTextFormat} for the duration
 * of the children traversal — no wrapping lexical node is produced.
 */
const InlineFormatRule = defineImportRule({
  $import: (ctx, el) => {
    const ownFormat = NODE_NAME_TO_FORMAT[el.nodeName] || 0;
    const inheritedFormat = ctx.get(ImportTextFormat);
    const styleBits = styleFormatBits(el.style);
    const merged = inheritedFormat | ownFormat | styleBits;
    if (merged === inheritedFormat) {
      return ctx.$importChildren(el);
    }
    return ctx.$importChildren(el, {
      context: [contextValue(ImportTextFormat, merged)],
    });
  },
  match: sel.tag('strong', 'em', 'i', 'code', 'mark', 's', 'sub', 'sup', 'u'),
  name: '@lexical/html/inline-format',
});

/**
 * `<b>` is special: Google Docs wraps copied content in a `<b
 * style="font-weight: normal">` that must NOT add bold (the outer wrapper
 * is just an opaque container). Only contribute IS_BOLD when the inline
 * style doesn't override the default.
 */
const BoldRule = defineImportRule({
  $import: (ctx, el) => {
    const inherited = ctx.get(ImportTextFormat);
    const ownFormat = el.style.fontWeight === 'normal' ? 0 : IS_BOLD;
    const styleBits = styleFormatBits(el.style);
    const merged = inherited | ownFormat | styleBits;
    if (merged === inherited) {
      return ctx.$importChildren(el);
    }
    return ctx.$importChildren(el, {
      context: [contextValue(ImportTextFormat, merged)],
    });
  },
  match: sel.tag('b'),
  name: '@lexical/html/b',
});

/**
 * `<span>` carries no own semantics but commonly hosts Google-Docs-style
 * CSS formatting. Push any style-derived format bits into context and
 * unwrap.
 */
const SpanRule = defineImportRule({
  $import: (ctx, el) => {
    const inherited = ctx.get(ImportTextFormat);
    const styleBits = styleFormatBits(el.style);
    const merged = inherited | styleBits;
    if (merged === inherited) {
      return ctx.$importChildren(el);
    }
    return ctx.$importChildren(el, {
      context: [contextValue(ImportTextFormat, merged)],
    });
  },
  match: sel.tag('span'),
  name: '@lexical/html/span',
});

/**
 * Walk up the DOM ancestor chain to determine whether `node` is inside a
 * `<pre>` (or any element with `white-space: pre*`). Pure ancestor walk,
 * no caching — kept simple since this is only called for text node
 * imports.
 */
function isInsidePre(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current !== null) {
    if (isHTMLElement(current)) {
      if (current.nodeName === 'PRE') {
        return true;
      }
      const ws = current.style.whiteSpace;
      if (typeof ws === 'string' && ws.startsWith('pre')) {
        return true;
      }
    }
    current = current.parentNode;
  }
  return false;
}

function isInlineSiblingTextEligible(node: Node): boolean {
  if (isHTMLElement(node)) {
    const display = node.style.display;
    if (display !== '' && !display.startsWith('inline')) {
      return false;
    }
  }
  return true;
}

function findAdjacentTextOnLine(text: Text, forward: boolean): Text | null {
  let node: Node = text;
  while (true) {
    let sibling: Node | null = null;
    while (
      (sibling = forward ? node.nextSibling : node.previousSibling) === null
    ) {
      const parent: Node | null = node.parentNode;
      if (parent === null) {
        return null;
      }
      node = parent;
    }
    node = sibling;
    if (!isInlineSiblingTextEligible(node)) {
      return null;
    }
    let descendant: Node | null = node;
    while ((descendant = forward ? node.firstChild : node.lastChild) !== null) {
      node = descendant;
    }
    if (isDOMTextNode(node)) {
      return node;
    }
    if (node.nodeName === 'BR') {
      return null;
    }
  }
}

function collapseWhitespace(textNode: Text): string {
  let textContent = (textNode.textContent || '')
    .replace(/\r/g, '')
    .replace(/[ \t\n]+/g, ' ');
  if (textContent.length === 0) {
    return '';
  }
  if (textContent[0] === ' ') {
    let neighbor: Text | null = textNode;
    let isStartOfLine = true;
    while (
      neighbor !== null &&
      (neighbor = findAdjacentTextOnLine(neighbor, false)) !== null
    ) {
      const neighborContent = neighbor.textContent || '';
      if (neighborContent.length > 0) {
        if (/[ \t\n]$/.test(neighborContent)) {
          textContent = textContent.slice(1);
        }
        isStartOfLine = false;
        break;
      }
    }
    if (isStartOfLine) {
      textContent = textContent.slice(1);
    }
  }
  if (textContent.length > 0 && textContent[textContent.length - 1] === ' ') {
    let neighbor: Text | null = textNode;
    let isEndOfLine = true;
    while (
      neighbor !== null &&
      (neighbor = findAdjacentTextOnLine(neighbor, true)) !== null
    ) {
      const neighborContent = (neighbor.textContent || '').replace(
        /^( |\t|\r?\n)+/,
        '',
      );
      if (neighborContent.length > 0) {
        isEndOfLine = false;
        break;
      }
    }
    if (isEndOfLine) {
      textContent = textContent.slice(0, -1);
    }
  }
  return textContent;
}

function applyFormat(node: LexicalNode, format: number): LexicalNode {
  if (
    format !== 0 &&
    'setFormat' in node &&
    typeof node.setFormat === 'function'
  ) {
    (node as unknown as {setFormat(f: number): void}).setFormat(format);
  }
  return node;
}

/**
 * `#text` rule. Inside a `<pre>` ancestor, preserve whitespace and split
 * on `\n` and `\t` into `LineBreakNode`/`TabNode` siblings. Otherwise
 * collapse whitespace using the same neighbor-aware rules as the legacy
 * `$convertTextDOMNode`.
 */
const TextRule = defineImportRule({
  $import: (ctx, el) => {
    const format = ctx.get(ImportTextFormat);
    if (isInsidePre(el)) {
      const raw = el.textContent || '';
      const parts = raw.split(/(\r?\n|\t)/);
      const out: LexicalNode[] = [];
      for (const part of parts) {
        if (part === '\n' || part === '\r\n') {
          out.push($createLineBreakNode());
        } else if (part === '\t') {
          out.push($createTabNode());
        } else if (part !== '') {
          out.push(applyFormat($createTextNode(part), format));
        }
      }
      return out;
    }
    const collapsed = collapseWhitespace(el);
    if (collapsed === '') {
      return [];
    }
    return [applyFormat($createTextNode(collapsed), format)];
  },
  match: sel.text(),
  name: '@lexical/html/#text',
});

/**
 * `<br>` rule.
 */
const LineBreakRule = defineImportRule({
  $import: () => [$createLineBreakNode()],
  match: sel.tag('br'),
  name: '@lexical/html/br',
});

/**
 * `<p>` rule. Re-applies format, indent, direction, and the legacy
 * `align` attribute fallback.
 */
const ParagraphRule = defineImportRule({
  $import: (ctx, el) => {
    const p = $createParagraphNode();
    $setFormatFromDOM(p, el);
    setNodeIndentFromDOM(el, p);
    if (p.getFormatType() === '') {
      const align = el.getAttribute('align');
      if (align && ALIGNMENT_VALUES.has(align as ElementFormatType)) {
        p.setFormat(align as ElementFormatType);
      }
    }
    $setDirectionFromDOM(p, el);
    // We deliberately pass no schema: paragraphs accept any inline run as-is.
    // The enclosing context (root / block) is responsible for ensuring the
    // paragraph itself is a valid block child.
    p.append(...ctx.$importChildren(el));
    return [p];
  },
  match: sel.tag('p'),
  name: '@lexical/html/p',
});

/**
 * Rules covering the {@link ParagraphNode}, {@link TextNode},
 * {@link LineBreakNode}, and {@link TabNode} cases that the legacy
 * `importDOM` machinery in `@lexical/lexical` handled. Intended to be
 * registered as a dependency of every editor that uses
 * {@link DOMImportExtension}.
 *
 * @experimental
 */
export const CoreImportRules = [
  ParagraphRule,
  TextRule,
  LineBreakRule,
  SpanRule,
  BoldRule,
  InlineFormatRule,
];
