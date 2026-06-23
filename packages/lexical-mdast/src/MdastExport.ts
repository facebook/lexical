/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CompiledMdast, MdastExportContext, MdastNode} from './types';
import type {ElementNode, LexicalNode} from 'lexical';
import type {Paragraph, PhrasingContent, RootContent} from 'mdast';

import {$getRoot, $isElementNode, $isLineBreakNode, $isTextNode} from 'lexical';
import {toMarkdown} from 'mdast-util-to-markdown';

import {phrasingFromFormattedText, TEXT_FORMAT_MASK} from './handlers';

function $isBlockNode(node: LexicalNode): boolean {
  return $isElementNode(node) && !node.isInline();
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
    // Fallbacks keep unknown nodes from disappearing entirely.
    if ($isTextNode(node)) {
      return [
        phrasingFromFormattedText(
          node.getTextContent(),
          node.getFormat() & TEXT_FORMAT_MASK,
        ),
      ];
    }
    if ($isLineBreakNode(node)) {
      return [{type: 'break'}];
    }
    if ($isElementNode(node)) {
      return context.exportChildren(node);
    }
    const text = node.getTextContent();
    return text ? [{type: 'text', value: text}] : [];
  }

  /**
   * Converts the inline children of `node` into phrasing content, merging
   * adjacent plain-text nodes that share a format so they serialize to a
   * single delimiter pair (e.g. `**ab**` rather than `**a****b**`).
   */
  function $exportInline(node: ElementNode): MdastNode[] {
    const result: MdastNode[] = [];
    let pendingFormat = -1;
    let pendingValue = '';
    const flushText = () => {
      if (pendingFormat >= 0) {
        result.push(phrasingFromFormattedText(pendingValue, pendingFormat));
        pendingFormat = -1;
        pendingValue = '';
      }
    };
    for (const child of node.getChildren()) {
      if (child.getType() === 'text' && $isTextNode(child)) {
        const format = child.getFormat() & TEXT_FORMAT_MASK;
        if (format === pendingFormat) {
          pendingValue += child.getTextContent();
        } else {
          flushText();
          pendingFormat = format;
          pendingValue = child.getTextContent();
        }
      } else {
        flushText();
        result.push(...$dispatch(child));
      }
    }
    flushText();
    return result;
  }

  /**
   * Converts a container whose Lexical children are inline (block quote, list
   * item) into mdast block content, splitting inline runs into paragraphs on
   * hard line breaks and passing nested block children through directly.
   */
  function $exportBlocks(node: ElementNode): MdastNode[] {
    const blocks: MdastNode[] = [];
    let inline: PhrasingContent[] = [];
    let pendingFormat = -1;
    let pendingValue = '';
    const flushText = () => {
      if (pendingFormat >= 0) {
        inline.push(phrasingFromFormattedText(pendingValue, pendingFormat));
        pendingFormat = -1;
        pendingValue = '';
      }
    };
    const flushParagraph = () => {
      flushText();
      if (inline.length > 0) {
        blocks.push({children: inline, type: 'paragraph'} satisfies Paragraph);
        inline = [];
      }
    };
    for (const child of node.getChildren()) {
      if ($isLineBreakNode(child)) {
        flushParagraph();
      } else if (child.getType() === 'text' && $isTextNode(child)) {
        const format = child.getFormat() & TEXT_FORMAT_MASK;
        if (format === pendingFormat) {
          pendingValue += child.getTextContent();
        } else {
          flushText();
          pendingFormat = format;
          pendingValue = child.getTextContent();
        }
      } else if ($isBlockNode(child)) {
        flushParagraph();
        blocks.push(...$dispatch(child));
      } else {
        flushText();
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
    const out = toMarkdown(
      {children, type: 'root'},
      {
        bullet: '-',
        extensions: compiled.toMarkdownExtensions,
      },
    );
    // toMarkdown always appends a trailing newline; drop it so callers get the
    // same shape as `@lexical/markdown`'s `$convertToMarkdownString`.
    return out.replace(/\n$/, '');
  };
}
