/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CompiledMdast, MdastExportContext, MdastNode} from './types';
import type {ElementNode, LexicalNode} from 'lexical';
import type {
  Break,
  Code,
  Heading,
  List,
  Paragraph,
  PhrasingContent,
  RootContent,
  ThematicBreak,
} from 'mdast';
import type {Options as ToMarkdownExtension} from 'mdast-util-to-markdown';

import {
  $getRoot,
  $getState,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
} from 'lexical';
import {defaultHandlers, toMarkdown} from 'mdast-util-to-markdown';

import {
  $exportLineBreak,
  $isBlockLevelNode,
  exportText,
  phrasingFromFormattedText,
  TEXT_FORMAT_MASK,
} from './handlers';
import {
  emphasisMarkerState,
  paragraphBreakState,
  strongMarkerState,
} from './state';

/** Reads a string field off an mdast node's `data`, if present. */
function dataField(node: {data?: unknown}, key: string): string | undefined {
  const data = node.data as Record<string, unknown> | undefined;
  const value = data ? data[key] : undefined;
  return typeof value === 'string' ? value : undefined;
}

type ToMarkdownState = Parameters<typeof defaultHandlers.code>[2];

/**
 * Runs `fn` with `state.options` temporarily overridden, restoring the
 * previous values afterwards so a per-node override never leaks into the rest
 * of the serialization.
 */
function withOptions<T>(
  state: ToMarkdownState,
  overrides: Partial<ToMarkdownState['options']>,
  fn: () => T,
): T {
  const options = state.options as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = options[key];
    options[key] = (overrides as Record<string, unknown>)[key];
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      options[key] = saved[key];
    }
  }
}

/**
 * A to-markdown extension whose handlers reproduce the literal Markdown syntax
 * captured on import (and stored on the Lexical nodes), by temporarily
 * steering the default handlers with per-node options. Delegating to the
 * defaults keeps all the indentation / nesting / disambiguation behavior
 * intact while still honoring each node's original marker/fence. Nodes without
 * captured syntax fall straight through to the defaults, so document-level
 * options (and contributed `toMarkdownExtensions`) still apply to them.
 */
const SYNTAX_TO_MARKDOWN: ToMarkdownExtension = {
  handlers: {
    break(node: Break, parent, state, info) {
      // Delegate first: the default handler substitutes a space when a real
      // EOL is unsafe in the current construct (headings, table cells). Only
      // when it chose the hard-break form does the preserved marker apply:
      // trailing-space markers are reproduced, and the empty marker means the
      // break is SOFT (a source newline or editor line break) and serializes
      // as a plain newline rather than being upgraded to a hard break.
      const result = defaultHandlers.break(node, parent, state, info);
      if (result !== '\\\n') {
        return result;
      }
      const marker = dataField(node, 'mdastBreak');
      if (!marker) {
        return '\n';
      }
      return /^ {2,}$/.test(marker) ? `${marker}\n` : result;
    },
    code(node: Code, parent, state, info) {
      const fence = dataField(node, 'mdastFence');
      if (!fence) {
        return defaultHandlers.code(node, parent, state, info);
      }
      return withOptions(
        state,
        {fence: fence[0] === '~' ? '~' : '`', fences: true},
        () => defaultHandlers.code(node, parent, state, info),
      );
    },
    heading(node: Heading, parent, state, info) {
      // `data.mdastSetext` is only present (true) for imported setext
      // headings; everything else defers to the document-level option.
      const data = node.data as {mdastSetext?: boolean} | undefined;
      if (!data || data.mdastSetext !== true) {
        return defaultHandlers.heading(node, parent, state, info);
      }
      return withOptions(state, {setext: true}, () =>
        defaultHandlers.heading(node, parent, state, info),
      );
    },
    list(node: List, parent, state, info) {
      if (node.ordered) {
        const ordered = dataField(node, 'mdastBulletOrdered');
        if (ordered !== '.' && ordered !== ')') {
          return defaultHandlers.list(node, parent, state, info);
        }
        return withOptions(state, {bulletOrdered: ordered}, () =>
          defaultHandlers.list(node, parent, state, info),
        );
      }
      const bullet = dataField(node, 'mdastBullet');
      if (bullet !== '-' && bullet !== '*' && bullet !== '+') {
        return defaultHandlers.list(node, parent, state, info);
      }
      return withOptions(
        state,
        {bullet, bulletOther: bullet === '-' ? '*' : '-'},
        () => defaultHandlers.list(node, parent, state, info),
      );
    },
    thematicBreak(node: ThematicBreak, parent, state) {
      const marker = dataField(node, 'mdastRule');
      if (marker !== '-' && marker !== '*' && marker !== '_') {
        return defaultHandlers.thematicBreak(node, parent, state);
      }
      return withOptions(state, {rule: marker}, () =>
        defaultHandlers.thematicBreak(node, parent, state),
      );
    },
  },
};

/**
 * Accumulates adjacent plain text nodes that share a format so they serialize
 * to a single delimiter pair (e.g. `**ab**` rather than `**a****b**`). Shared
 * by the inline and block export walks.
 */
class TextRunAccumulator {
  private format = -1;
  private value = '';

  /**
   * Returns `true` when `child` was absorbed. A format change flushes the
   * previous run into `out` first.
   */
  push(child: LexicalNode, out: MdastNode[]): boolean {
    if (child.getType() !== 'text' || !$isTextNode(child)) {
      return false;
    }
    const format = child.getFormat() & TEXT_FORMAT_MASK;
    if (format === this.format) {
      this.value += child.getTextContent();
    } else {
      this.flushInto(out);
      this.format = format;
      this.value = child.getTextContent();
    }
    return true;
  }

  flushInto(out: MdastNode[]): void {
    if (this.format >= 0) {
      out.push(phrasingFromFormattedText(this.value, this.format));
    }
    this.format = -1;
    this.value = '';
  }
}

function createNodeExporter(compiled: CompiledMdast) {
  const {exportHandlers} = compiled;

  const context: MdastExportContext = {
    exportBlocks: node => $exportBlocks(node),
    exportChildren: node => {
      const out: MdastNode[] = [];
      for (const child of node.getChildren()) {
        out.push(...$dispatch(child));
      }
      return out;
    },
    exportInline: node => $exportInline(node),
  };

  function $dispatch(node: LexicalNode): MdastNode[] {
    const handler = exportHandlers.get(node.getType());
    if (handler) {
      const result = handler(node, context);
      if (result != null) {
        return Array.isArray(result) ? result : [result];
      }
    }
    // Fallbacks keep unknown nodes from disappearing entirely; text and line
    // breaks reuse the core handlers so their behavior can't drift.
    const asText = exportText(node, context);
    if (asText != null) {
      return Array.isArray(asText) ? asText : [asText];
    }
    const asBreak = $exportLineBreak(node, context);
    if (asBreak != null) {
      return Array.isArray(asBreak) ? asBreak : [asBreak];
    }
    if ($isElementNode(node)) {
      return context.exportChildren(node);
    }
    const text = node.getTextContent();
    return text ? [{type: 'text', value: text}] : [];
  }

  /**
   * Converts the inline children of `node` into phrasing content.
   */
  function $exportInline(node: ElementNode): MdastNode[] {
    const result: MdastNode[] = [];
    const runs = new TextRunAccumulator();
    for (const child of node.getChildren()) {
      if (!runs.push(child, result)) {
        runs.flushInto(result);
        result.push(...$dispatch(child));
      }
    }
    runs.flushInto(result);
    return result;
  }

  /**
   * Converts a container whose Lexical children are inline (block quote, list
   * item) into mdast block content. A LineBreakNode marked as a paragraph
   * boundary (set by the import handlers when joining sibling paragraphs)
   * splits the content; any other LineBreakNode stays an inline `break`
   * (hard or soft according to its marker). Nested block children pass
   * through directly.
   */
  function $exportBlocks(node: ElementNode): MdastNode[] {
    const blocks: MdastNode[] = [];
    let inline: PhrasingContent[] = [];
    const runs = new TextRunAccumulator();
    const flushParagraph = () => {
      runs.flushInto(inline as MdastNode[]);
      if (inline.length > 0) {
        blocks.push({children: inline, type: 'paragraph'} satisfies Paragraph);
        inline = [];
      }
    };
    for (const child of node.getChildren()) {
      if ($isLineBreakNode(child)) {
        if ($getState(child, paragraphBreakState)) {
          flushParagraph();
        } else {
          runs.flushInto(inline as MdastNode[]);
          inline.push($exportLineBreak(child, context) as Break);
        }
      } else if (runs.push(child, inline as MdastNode[])) {
        continue;
      } else if ($isBlockLevelNode(child)) {
        flushParagraph();
        blocks.push(...$dispatch(child));
      } else {
        runs.flushInto(inline as MdastNode[]);
        inline.push(...($dispatch(child) as PhrasingContent[]));
      }
    }
    flushParagraph();
    if (blocks.length === 0) {
      blocks.push({children: [], type: 'paragraph'} satisfies Paragraph);
    }
    return blocks;
  }

  return {$dispatch};
}

/**
 * Picks the document-level emphasis and strong delimiters from the first
 * italic / bold text node that recorded a known delimiter on import, scanning
 * the tree rooted at `node`. Mixing delimiters within one document is not
 * supported by to-markdown's escaping, so a single choice is made per
 * document; nodes with no recorded delimiter (created in the editor) are
 * skipped so they cannot mask the document's authored style.
 */
function $dominantInlineMarkers(node: ElementNode): {
  emphasis: '*' | '_' | undefined;
  strong: '*' | '_' | undefined;
} {
  let emphasis: '*' | '_' | undefined;
  let strong: '*' | '_' | undefined;
  const visit = (element: ElementNode): void => {
    for (const child of element.getChildren()) {
      if ($isTextNode(child)) {
        if (emphasis === undefined && child.hasFormat('italic')) {
          const marker = $getState(child, emphasisMarkerState);
          if (marker === '_') {
            emphasis = '_';
          }
        }
        if (strong === undefined && child.hasFormat('bold')) {
          const marker = $getState(child, strongMarkerState);
          if (marker === '_') {
            strong = '_';
          }
        }
      } else if ($isElementNode(child)) {
        visit(child);
      }
      if (emphasis !== undefined && strong !== undefined) {
        return;
      }
    }
  };
  visit(node);
  return {emphasis, strong};
}

/**
 * Creates a reusable exporter that converts the Lexical tree rooted at the
 * supplied element (or the editor root) into a Markdown string.
 */
export function createMdastExport(
  compiled: CompiledMdast,
): (node?: ElementNode) => string {
  const {$dispatch} = createNodeExporter(compiled);

  return node => {
    const root = node || $getRoot();
    const children: RootContent[] = [];
    for (const child of root.getChildren()) {
      for (const mdastNode of $dispatch(child)) {
        children.push(mdastNode as RootContent);
      }
    }
    // Emphasis/strong delimiters are document-level; the delimiter recorded on
    // import wins, otherwise contributed toMarkdownExtensions (and the '-'
    // bullet baseline) decide. Defaults ride as the FIRST extension so that
    // contributed extensions can override them; SYNTAX_TO_MARKDOWN runs last
    // so its handlers reproduce the per-node syntax captured on import.
    const {emphasis, strong} = $dominantInlineMarkers(root);
    const defaults: ToMarkdownExtension = {bullet: '-'};
    if (emphasis) {
      defaults.emphasis = emphasis;
    }
    if (strong) {
      defaults.strong = strong;
    }
    const out = toMarkdown(
      {children, type: 'root'},
      {
        extensions: [
          defaults,
          ...compiled.toMarkdownExtensions,
          SYNTAX_TO_MARKDOWN,
        ],
      },
    );
    // toMarkdown always appends a trailing newline; drop it so callers get the
    // same shape as `@lexical/markdown`'s `$convertToMarkdownString`.
    return out.replace(/\n$/, '');
  };
}
