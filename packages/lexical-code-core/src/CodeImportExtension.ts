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
import {configExtension, defineExtension, isHTMLElement} from 'lexical';

import {CodeExtension} from './CodeExtension';
import {$createCodeNode} from './CodeNode';

const LANGUAGE_DATA_ATTRIBUTE = 'data-language';

/**
 * True if `node` (or one of its descendants) has a child element with
 * `tagName`. Mirrors the legacy helper inside `@lexical/code-core/CodeNode`.
 */
function hasChildDOMNodeTag(node: Node, tagName: string): boolean {
  for (const child of node.childNodes) {
    if (isHTMLElement(child) && child.tagName === tagName) {
      return true;
    }
    if (hasChildDOMNodeTag(child, tagName)) {
      return true;
    }
  }
  return false;
}

/**
 * True for elements whose `font-family` mentions `monospace` — the
 * heuristic the legacy `<div>` rule uses to spot copy-pasted code blocks
 * (e.g. Google Docs serializes a code block as a styled `<div>`).
 */
function isMonospaceElement(el: HTMLElement): boolean {
  return el.style.fontFamily.match('monospace') !== null;
}

function isMonospaceDescendant(node: HTMLElement): boolean {
  let parent: HTMLElement | null = node.parentElement;
  while (parent !== null) {
    if (isMonospaceElement(parent)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * Overlay rules active only while {@link GitHubCodeTableRule} is
 * processing its children. Inside the code-table subtree, every `<tr>`
 * and `<td>` unwraps unconditionally — they never become table-row /
 * table-cell nodes (even when `@lexical/table` registers its rules for
 * those tags). Outside the subtree, this overlay isn't installed, so
 * the cost of these rules is never paid against unrelated `<tr>` /
 * `<td>` pastes.
 */
const GitHubCodeTableOverlayRules = [
  defineImportRule({
    $import: (ctx, el) => ctx.$importChildren(el),
    match: sel.tag('tr', 'td'),
    name: '@lexical/code/github-code-table/unwrap',
  }),
];

const PreRule = defineImportRule({
  $import: (ctx, el) => {
    const language = el.getAttribute(LANGUAGE_DATA_ATTRIBUTE);
    const node = $createCodeNode(language);
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
  },
  match: sel.tag('pre'),
  name: '@lexical/code/pre',
});

/**
 * Multi-line `<code>` (containing newlines or `<br>`) is treated as a
 * block code element — mirrors the legacy behavior. Single-line `<code>`
 * defers to the inline-format rule from `CoreImportExtension` so it
 * becomes a TextNode with IS_CODE.
 */
const MultilineCodeRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const text = el.textContent || '';
    const isMultiLine = /\r?\n/.test(text) || hasChildDOMNodeTag(el, 'BR');
    if (!isMultiLine) {
      return $next();
    }
    const language = el.getAttribute(LANGUAGE_DATA_ATTRIBUTE);
    const node = $createCodeNode(language);
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
  },
  match: sel.tag('code'),
  name: '@lexical/code/code-multiline',
});

/**
 * A `<div style="font-family: …monospace…">` (Google-Docs-style code
 * block) creates a CodeNode. Descendant elements inside a monospace
 * wrapper just unwrap so their text content flows into the surrounding
 * CodeNode.
 */
const DivRule = defineImportRule({
  $import: (ctx, el, $next) => {
    if (isMonospaceElement(el)) {
      const node = $createCodeNode();
      node.splice(0, 0, ctx.$importChildren(el));
      return [node];
    }
    if (isMonospaceDescendant(el)) {
      // Unwrap so children flow into the enclosing CodeNode.
      return ctx.$importChildren(el);
    }
    return $next();
  },
  match: sel.tag('div'),
  name: '@lexical/code/div',
});

/**
 * GitHub raw-file-view `<table class="js-file-line-container">` becomes
 * a CodeNode. Walking the table's children pushes an overlay (see
 * {@link GitHubCodeTableOverlayRules}) so `<tr>` / `<td>` inside this
 * subtree unwrap unconditionally — without paying the predicate cost
 * on every other `<tr>` / `<td>` paste elsewhere.
 */
const GitHubCodeTableRule = defineImportRule({
  $import: (ctx, el) => {
    const node = $createCodeNode();
    node.splice(
      0,
      0,
      ctx.$importChildren(el, {rules: GitHubCodeTableOverlayRules}),
    );
    return [node];
  },
  match: sel.tag('table').classAll('js-file-line-container'),
  name: '@lexical/code/github-code-table',
});

/**
 * Stray `<td class="js-file-line">` (cell with the explicit GitHub code-
 * line class but no surrounding code-table wrapper) — unwrap so the
 * descendant text flows up into whatever context the cell is in. The
 * class is part of the selector itself, so no runtime guard.
 */
const GitHubCodeCellByClassRule = defineImportRule({
  $import: (ctx, el) => ctx.$importChildren(el),
  match: sel.tag('td').classAll('js-file-line'),
  name: '@lexical/code/github-code-cell-by-class',
});

/**
 * Import rules for {@link CodeNode}.
 *
 * Specific class-restricted rules (GitHub raw-file-view detectors) are
 * registered before the generic `<table>` / `<tr>` / `<td>` rules so
 * they win dispatch.
 *
 * @experimental
 */
export const CodeImportRules = [
  // Higher-priority (more-specific) rules first:
  GitHubCodeTableRule,
  GitHubCodeCellByClassRule,
  MultilineCodeRule,
  PreRule,
  DivRule,
];

/**
 * Bundles {@link CodeImportRules} (plus {@link CoreImportExtension}) into
 * a single dependency. The legacy {@link CodeNode.importDOM} continues to
 * work in parallel; depend on this extension to opt into the new
 * pipeline.
 *
 * @experimental
 */
export const CodeImportExtension = defineExtension({
  dependencies: [
    CoreImportExtension,
    // Registers CodeNode (and CodeHighlightNode) so the rules can safely
    // $createCodeNode.
    CodeExtension,
    configExtension(DOMImportExtension, {rules: CodeImportRules}),
  ],
  name: '@lexical/code/Import',
});
