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
 * GitHub renders raw file views with a `<table class="js-file-line-container">`
 * whose rows hold one source line per `<td class="js-file-line">`. The
 * legacy converter detects this shape and turns the whole table into a
 * single CodeNode whose content is the text of each `<td>` separated by
 * line breaks. We collapse to the same shape via a per-table rule plus
 * "ignore" rules on the wrapping `<tr>` / `<td>` so they don't try to
 * become table cells or paragraphs.
 */
function isGitHubCodeTable(table: HTMLTableElement): boolean {
  return table.classList.contains('js-file-line-container');
}

function isGitHubCodeCell(cell: HTMLTableCellElement): boolean {
  return cell.classList.contains('js-file-line');
}

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
 * GitHub raw-file-view `<table>`s are turned into a single CodeNode.
 */
const GitHubCodeTableRule = defineImportRule({
  $import: (ctx, el, $next) => {
    if (!isGitHubCodeTable(el)) {
      return $next();
    }
    const node = $createCodeNode();
    node.splice(0, 0, ctx.$importChildren(el));
    return [node];
  },
  match: sel.tag('table').classAll('js-file-line-container'),
  name: '@lexical/code/github-code-table',
});

/**
 * GitHub raw-file-view `<td>`s: when the cell is a code line, or when
 * nested inside a code table, emit nothing of our own and let descendant
 * text flow up. This mirrors the legacy `convertCodeNoop` behavior.
 */
const GitHubCodeCellRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const table = el.closest('table');
    if (
      !isGitHubCodeCell(el) &&
      !(
        table instanceof Object &&
        isHTMLElement(table) &&
        isGitHubCodeTable(table as HTMLTableElement)
      )
    ) {
      return $next();
    }
    return ctx.$importChildren(el);
  },
  match: sel.tag('td'),
  name: '@lexical/code/github-code-cell',
});

const GitHubCodeRowRule = defineImportRule({
  $import: (ctx, el, $next) => {
    const table = el.closest('table');
    if (!table || !isHTMLElement(table) || !isGitHubCodeTable(table)) {
      return $next();
    }
    return ctx.$importChildren(el);
  },
  match: sel.tag('tr'),
  name: '@lexical/code/github-code-row',
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
  GitHubCodeCellRule,
  GitHubCodeRowRule,
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
