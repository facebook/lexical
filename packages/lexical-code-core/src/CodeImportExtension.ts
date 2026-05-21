/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMPreprocessFn} from '@lexical/html';

import {
  CoreImportExtension,
  defineImportRule,
  defineOverlayRules,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {
  configExtension,
  defineExtension,
  isDOMDocumentNode,
  isHTMLElement,
} from 'lexical';
import invariant from 'shared/invariant';

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
const GitHubCodeTableOverlayRules = defineOverlayRules([
  defineImportRule({
    $import: (ctx, el) => ctx.$importChildren(el),
    match: sel.tag('tr', 'td'),
    name: '@lexical/code/github-code-table/unwrap',
  }),
]);

const PreRule = defineImportRule({
  $import: (ctx, el) => [
    $createCodeNode(el.getAttribute(LANGUAGE_DATA_ATTRIBUTE)).splice(
      0,
      0,
      ctx.$importChildren(el),
    ),
  ],
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
    return [
      $createCodeNode(el.getAttribute(LANGUAGE_DATA_ATTRIBUTE)).splice(
        0,
        0,
        ctx.$importChildren(el),
      ),
    ];
  },
  match: sel.tag('code'),
  name: '@lexical/code/code-multiline',
});

/**
 * True for elements carrying BOTH `font-family: …monospace…` and
 * `white-space: pre*` inline — the shape VS Code uses for every line
 * of a copied code block (on every per-line `<div>` on Safari, on
 * the single outer wrapper on Chrome).
 */
function isMonospacePreElement(el: Element): boolean {
  if (!isHTMLElement(el)) {
    return false;
  }
  const ff = el.style.fontFamily;
  const ws = el.style.whiteSpace;
  return (
    typeof ff === 'string' &&
    /monospace/i.test(ff) &&
    typeof ws === 'string' &&
    ws.startsWith('pre')
  );
}

function trimBlankLines(lines: string[]): void {
  while (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
}

/**
 * Split a monospace-pre wrapper element into logical code lines:
 * `<div>` children contribute their text content as one line,
 * `<br>` children contribute an empty line, inline children (spans
 * and bare text) accumulate into the current line until the next
 * block child.
 *
 * Returns `null` if `el` has no block children (i.e. it's a leaf
 * line, not a wrapper) so the caller can leave it to the
 * sibling-run pass.
 */
function splitMonospaceWrapperLines(el: HTMLElement): string[] | null {
  let hasBlockChild = false;
  const lines: string[] = [];
  let acc = '';
  let hasAcc = false;
  const flush = () => {
    if (hasAcc) {
      lines.push(acc);
      acc = '';
      hasAcc = false;
    }
  };
  for (const child of Array.from(el.childNodes)) {
    if (isHTMLElement(child)) {
      if (child.tagName === 'DIV') {
        flush();
        lines.push(child.textContent || '');
        hasBlockChild = true;
      } else if (child.tagName === 'BR') {
        flush();
        lines.push('');
        hasBlockChild = true;
      } else {
        acc += child.textContent || '';
        hasAcc = true;
      }
    } else if (child.nodeType === 3 /* text */) {
      const t = child.textContent || '';
      if (t.length > 0) {
        acc += t;
        hasAcc = true;
      }
    }
  }
  flush();
  if (!hasBlockChild) {
    return null;
  }
  trimBlankLines(lines);
  return lines;
}

function $replaceWithPre(
  range: readonly Node[],
  parent: ParentNode,
  text: string,
): HTMLPreElement {
  const doc = parent.ownerDocument;
  invariant(doc !== null, 'expected owning document');
  const pre = doc.createElement('pre');
  pre.textContent = text;
  parent.insertBefore(pre, range[0]);
  for (const node of range) {
    if (node.parentNode === parent) {
      parent.removeChild(node);
    }
  }
  return pre;
}

/**
 * VS Code → browser code-block pastes ship the block as either:
 *
 *  - **Chrome**: one outer
 *    `<div style="font-family: …monospace…; white-space: pre">…</div>`
 *    wrapping per-line `<div>`s and `<br>`s.
 *  - **Safari**: a flat run of sibling
 *    `<div style="…monospace…; white-space: pre">…</div>`
 *    and `<br style="…monospace…; …">` elements with no wrapping
 *    monospace ancestor (the styles are duplicated onto every
 *    element).
 *
 * The legacy `<div>` rule produces one CodeNode per `<div>` on
 * Safari and concatenates inner divs without separating `\n`s on
 * Chrome. This preprocess detects either shape and rewrites the
 * affected DOM into a single `<pre>` with the joined text content,
 * which the existing {@link PreRule} then imports as a single
 * CodeNode. The rewrite is global on purpose — we only consolidate
 * if the structural signal (monospace+pre wrapper OR a run of two
 * or more monospace+pre siblings) is unambiguous.
 *
 * @experimental
 */
export const $consolidateVscodeCodePaste: DOMPreprocessFn = (
  dom,
  _ctx,
  $next,
) => {
  const root: ParentNode = isDOMDocumentNode(dom) ? dom.body : dom;
  $walkConsolidate(root);
  $next();
};

function $walkConsolidate(parent: ParentNode): void {
  // First, consolidate any monospace+pre WRAPPER children (the Chrome
  // shape): replace each with a <pre> containing the joined text of
  // its line-children. We do this before scanning sibling runs so a
  // wrapper that ends up at the same level as other wrappers doesn't
  // accidentally pair with them.
  for (const child of Array.from(parent.children)) {
    if (isHTMLElement(child) && isMonospacePreElement(child)) {
      const lines = splitMonospaceWrapperLines(child);
      if (lines !== null && lines.length > 0) {
        $replaceWithPre([child], parent, lines.join('\n'));
      }
      // A monospace-pre leaf (no block children) isn't a wrapper — leave
      // it to the sibling-run pass below.
      continue;
    }
    // Recurse into non-monospace children so we find nested wrappers
    // (e.g. a code paste inside a quote).
    $walkConsolidate(child);
  }
  // Then look for runs of consecutive monospace+pre siblings (the
  // Safari shape) at this level.
  let cursor: ChildNode | null = parent.firstChild;
  while (cursor) {
    if (!isHTMLElement(cursor) || !isMonospacePreElement(cursor)) {
      cursor = cursor.nextSibling;
      continue;
    }
    const run: ChildNode[] = [];
    const lines: string[] = [];
    let probe: ChildNode | null = cursor;
    while (probe) {
      if (isHTMLElement(probe) && isMonospacePreElement(probe)) {
        run.push(probe);
        lines.push(probe.tagName === 'BR' ? '' : probe.textContent || '');
        probe = probe.nextSibling;
      } else if (
        probe.nodeType === 3 &&
        (probe.textContent || '').trim() === ''
      ) {
        // Whitespace text between monospace siblings — absorb into the
        // run so removing the run also drops the interstitial whitespace.
        run.push(probe);
        probe = probe.nextSibling;
      } else {
        break;
      }
    }
    if (run.length > 1) {
      trimBlankLines(lines);
      const pre = $replaceWithPre(run, parent, lines.join('\n'));
      cursor = pre.nextSibling;
    } else {
      cursor = run[run.length - 1].nextSibling;
    }
  }
}

/**
 * A `<div style="font-family: …monospace…">` (Google-Docs-style code
 * block) creates a CodeNode. Descendant elements inside a monospace
 * wrapper just unwrap so their text content flows into the surrounding
 * CodeNode.
 */
const DivRule = defineImportRule({
  $import: (ctx, el, $next) => {
    if (isMonospaceElement(el)) {
      return [$createCodeNode().splice(0, 0, ctx.$importChildren(el))];
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
    configExtension(DOMImportExtension, {
      preprocess: [$consolidateVscodeCodePaste],
      rules: CodeImportRules,
    }),
  ],
  name: '@lexical/code/Import',
});
