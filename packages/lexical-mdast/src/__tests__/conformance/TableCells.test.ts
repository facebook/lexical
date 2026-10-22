/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Randomized checks that what MdastTableExtension writes in a cell reads
// back as it was, in micromark and in markdown-it, and that it falls back to
// an HTML table only for content GFM has no form for. Not part of the unit
// tests: `pnpm run test-conformance`, with FUZZ_RUNS and FUZZ_SEED to vary
// the runs.

import type {Html, Paragraph, PhrasingContent, Table} from 'mdast';

import {
  buildEditorFromExtensions,
  configExtension,
  HorizontalRuleNode,
} from '@lexical/extension';
import {$isTableNode} from '@lexical/table';
import {$getRoot, defineExtension, type ElementNode} from 'lexical';
import MarkdownIt from 'markdown-it';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {gfmTableFromMarkdown, gfmTableToMarkdown} from 'mdast-util-gfm-table';
import {mathFromMarkdown, mathToMarkdown} from 'mdast-util-math';
import {toMarkdown} from 'mdast-util-to-markdown';
import {gfmTable} from 'micromark-extension-gfm-table';
import {math} from 'micromark-extension-math';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExtension,
  MdastHtmlExtension,
  MdastTableExtension,
} from '../../index';

const RUNS = Number(process.env.FUZZ_RUNS || 2000);
const SEED = Number(process.env.FUZZ_SEED || 9323);

/** A small seeded generator (mulberry32), so a failure can be rerun. */
function random(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(next: () => number): PhrasingContent[] {
  const pick = <T>(items: readonly T[]): T =>
    items[Math.floor(next() * items.length)];
  const word = (chars: string) =>
    Array.from({length: 1 + Math.floor(next() * 6)}, () => pick([...chars]))
      .join('')
      .replace(/^\s+|\s+$/g, '') || 'a';
  // Text first, so that raw HTML doesn't start a block of its own.
  const nodes: PhrasingContent[] = [{type: 'text', value: 'x '}];
  for (let i = 0, n = 1 + Math.floor(next() * 3); i < n; i++) {
    const kind = pick([
      'text',
      'code',
      'math',
      'html',
      'break',
      'strong',
      'link',
    ] as const);
    if (kind === 'text') {
      nodes.push({type: 'text', value: word('ab |\\*&<')});
    } else if (kind === 'strong') {
      nodes.push({
        children: [
          {type: 'text', value: word('ab |\\')},
          {type: 'inlineCode', value: word('ab |\\')},
        ],
        type: 'strong',
      });
    } else if (kind === 'link') {
      nodes.push({
        children: [{type: 'text', value: word('ab |')}],
        title: word('ab |\\'),
        type: 'link',
        url: word('ab|\\'),
      });
    } else if (kind === 'code') {
      nodes.push({type: 'inlineCode', value: word('ab |\\')});
    } else if (kind === 'math') {
      nodes.push({type: 'inlineMath', value: word('ab |\\{}\n')} as never);
    } else if (kind === 'html') {
      const tag = pick(['b', 'pre', 'script']);
      nodes.push({
        type: 'html',
        value: `<${tag} title="${word('ab |\\\n')}">${word('ab |\\\n')}</${tag}>`,
      });
    } else {
      // A hard break, as read; an editor's line break is written as a
      // newline outside a cell.
      nodes.push({data: {mdastBreak: '\\'}, type: 'break'} as never);
    }
    // A paragraph doesn't end at a break.
    nodes.push({type: 'text', value: ' x '});
  }
  return nodes;
}

/** Whether GFM has no form for `nodes` in a cell, which takes HTML. */
function needsHtml(nodes: PhrasingContent[]): boolean {
  return nodes.some(node => {
    const {children, value} = node as {
      children?: PhrasingContent[];
      value?: string;
    };
    return (
      (children !== undefined && needsHtml(children)) ||
      (/^(?:html|inlineCode|inlineMath)$/.test(node.type) &&
        (/[\r\n]/.test(value!) || /(?:^|[^\\])(?:\\\\)*\\\|/.test(value!)))
    );
  });
}

function exportCell(nodes: PhrasingContent[]): string {
  using editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        MdastCommonMarkExtension,
        MdastTableExtension,
        MdastHtmlExtension,
        configExtension(MdastExtension, {
          exportRules: [
            {
              $export: () => ({children: nodes, type: 'paragraph'}),
              type: HorizontalRuleNode,
            },
          ],
          toMarkdownExtensions: [mathToMarkdown()],
        }),
      ],
      name: '[root]',
    }),
  );
  editor.update(
    () => {
      $convertFromMarkdownString('| h | i |\n| - | - |\n| b | z |');
      const table = $getRoot().getFirstChild();
      if ($isTableNode(table)) {
        const cell = table
          .getLastChildOrThrow<ElementNode>()
          .getFirstChildOrThrow<ElementNode>();
        cell.clear().append(new HorizontalRuleNode());
      }
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString());
}

const markdownIt = new MarkdownIt({html: true});

/**
 * HTML as the DOM reads it, without the whitespace between blocks or at the
 * start of a line, which renders as nothing.
 */
function normalize(html: string): string {
  const body = new DOMParser().parseFromString(
    `<body>${html}`,
    'text/html',
  ).body;
  return body.innerHTML.replace(/\s*\n\s*/g, '\n').replace(/<br>\s*/g, '<br>');
}

/**
 * What markdown-it makes of `nodes` as a paragraph of their own, written
 * with GFM's table syntax kept from starting a line, as in a table.
 */
function paragraphHtml(nodes: PhrasingContent[]): string {
  const markdown = toMarkdown(
    {children: [{children: nodes, type: 'paragraph'}], type: 'root'},
    {extensions: [mathToMarkdown(), gfmTableToMarkdown()]},
  );
  return normalize(unwrap(markdownIt.render(markdown)));
}

/** A paragraph's content, as a cell holds it without the paragraph. */
function unwrap(html: string): string {
  return html
    .trim()
    .replace(/^<p>([^]*)<\/p>$/, '$1')
    .trim();
}

/** The phrasing micromark reads in the cell, with GFM's `\|` read too. */
function micromarkCell(markdown: string): PhrasingContent[] {
  const [table] = fromMarkdown(markdown, {
    extensions: [gfmTable(), math()],
    mdastExtensions: [gfmTableFromMarkdown(), mathFromMarkdown()],
  }).children as Table[];
  expect(table.type).toBe('table');
  expect(table.children.map(row => row.children.length)).toEqual([2, 2]);
  return table.children[1].children[0].children.map(node =>
    node.type === 'html' || (node.type as string) === 'inlineMath'
      ? {
          ...node,
          value: (node as Html).value.replace(/\\\|/g, '|'),
        }
      : node,
  );
}

/**
 * `nodes` without positions, with adjacent text joined, a `<br>` as the
 * break it is, and the spaces beside a break or an edge, which render as
 * nothing, dropped.
 */
function plain(nodes: PhrasingContent[]): unknown[] {
  const joined: {type: string; value?: string}[] = [];
  for (const node of nodes) {
    const {type, value} = node as {type: string; value: string};
    const last = joined[joined.length - 1];
    if (type === 'break' || (type === 'html' && /^<br>$/.test(value))) {
      joined.push({type: 'break'});
    } else if (type === 'text' && last && last.type === 'text') {
      last.value += value;
    } else {
      joined.push({type, value});
    }
  }
  return joined
    .map((node, i) =>
      node.type !== 'text'
        ? node
        : {
            ...node,
            value: node
              .value!.replace(
                !i || joined[i - 1].type === 'break' ? /^\s+/ : /^$/,
                '',
              )
              .replace(
                i === joined.length - 1 || joined[i + 1].type === 'break'
                  ? /\s+$/
                  : /^$/,
                '',
              ),
          },
    )
    .filter(node => node.type !== 'text' || node.value);
}

describe('MdastTableExtension cells', () => {
  it(
    `read back as written in ${RUNS} random cells (seed ${SEED})`,
    () => {
      const next = random(SEED);
      for (let run = 0; run < RUNS; run++) {
        const nodes = generate(next);
        const markdown = exportCell(nodes);
        const html = markdown.startsWith('<table>');
        const context = JSON.stringify({markdown, nodes, run});
        expect(html, context).toBe(needsHtml(nodes));
        // The first body cell as markdown-it writes it, which its HTML ends.
        const cell = /<td>([^]*?)<\/td>\s*<td>/.exec(
          markdownIt.render(markdown),
        );
        expect(cell, context).not.toBeNull();
        expect(normalize(unwrap(cell![1])), context).toBe(paragraphHtml(nodes));
        if (!html) {
          // Text micromark reads from the cell, as it reads the paragraph.
          const [paragraph] = fromMarkdown(
            toMarkdown(
              {children: [{children: nodes, type: 'paragraph'}], type: 'root'},
              {extensions: [mathToMarkdown(), gfmTableToMarkdown()]},
            ),
            {extensions: [math()], mdastExtensions: [mathFromMarkdown()]},
          ).children as Paragraph[];
          expect(plain(micromarkCell(markdown)), context).toEqual(
            plain(paragraph.children),
          );
        }
      }
    },
    RUNS * 20,
  );
});
