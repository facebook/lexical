/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type LexicalNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

// Describes the inline content of a block as e.g. `**a**|b`, where `|` is a
// LineBreakNode and `**`, `*`, `` ` `` mark bold, italic and code text.
function describeNode(node: LexicalNode): string {
  if ($isLineBreakNode(node)) {
    return '|';
  }
  if ($isTextNode(node)) {
    const text = node.getTextContent();
    if (node.hasFormat('code')) {
      return '`' + text + '`';
    }
    if (node.hasFormat('bold')) {
      return '**' + text + '**';
    }
    if (node.hasFormat('italic')) {
      return '*' + text + '*';
    }
    return text;
  }
  if ($isElementNode(node)) {
    return `<${node.getType()}>${node.getChildren().map(describeNode).join('')}</>`;
  }
  return `[${node.getType()}]`;
}

function importMarkdown(
  markdown: string,
  shouldPreserveNewLines = false,
): {blocks: string[]; exported: string} {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  let blocks: string[] = [];
  let exported = '';
  editor.update(
    () => {
      $convertFromMarkdownString(
        markdown,
        TRANSFORMERS,
        undefined,
        shouldPreserveNewLines,
      );
      blocks = $getRoot().getChildren().map(describeNode);
      exported = $convertToMarkdownString(
        TRANSFORMERS,
        undefined,
        shouldPreserveNewLines,
      );
    },
    {discrete: true},
  );
  return {blocks, exported};
}

describe('inline formats that continue on the next line of a block', () => {
  it.each([
    ['bold', '**a\nb**', '<paragraph>**a**|**b**</>'],
    ['italic', '*foo\nbar*', '<paragraph>*foo*|*bar*</>'],
    ['underscore italic', '_foo\nbar_', '<paragraph>*foo*|*bar*</>'],
    ['code span', 'x `a\nb` y', '<paragraph>x `a`|`b` y</>'],
    ['bold over three lines', '**a\nb\nc**', '<paragraph>**a**|**b**|**c**</>'],
    [
      'text around the span',
      'before **a\nb** after',
      '<paragraph>before **a**|**b** after</>',
    ],
    [
      'two spans on different lines',
      '**a\nb** and *c\nd*',
      '<paragraph>**a**|**b** and *c*|*d*</>',
    ],
  ])('imports %s', (_name, markdown, expected) => {
    expect(importMarkdown(markdown).blocks).toEqual([expected]);
  });

  it('does not escape the delimiters on export', () => {
    for (const markdown of ['**a\nb**', '*foo\nbar*', 'x `a\nb` y']) {
      const {exported} = importMarkdown(markdown);
      expect(exported).not.toContain('\\');
      // Importing the export again gives the same document.
      expect(importMarkdown(exported).blocks).toEqual(
        importMarkdown(markdown).blocks,
      );
    }
  });

  it('keeps the per-line workaround working', () => {
    expect(importMarkdown('**a**\n**b**')).toEqual({
      blocks: ['<paragraph>**a**|**b**</>'],
      exported: '**a**\n**b**',
    });
  });

  it('keeps hard line breaks inside formatted text', () => {
    const {blocks, exported} = importMarkdown('**a  \nb**\n*c\\\nd*');
    expect(blocks).toEqual(['<paragraph>**a**|**b**|*c*|*d*</>']);
    expect(exported).toBe('**a**  \n**b**\n*c*\\\n*d*');
  });

  it('works for lazy continuation lines in quotes and list items', () => {
    expect(importMarkdown('> **a\n> b**').blocks).toEqual([
      '<quote>**a**|**b**</>',
    ]);
    expect(importMarkdown('- **a\nb**').blocks).toEqual([
      '<list><listitem>**a**|**b**</></>',
    ]);
  });

  it('does not pair delimiters across a blank line', () => {
    expect(importMarkdown('**a\n\nb**').blocks).toEqual([
      '<paragraph>**a</>',
      '<paragraph>b**</>',
    ]);
  });

  it('does not pair delimiters across separate blocks', () => {
    expect(importMarkdown('# **a\nb**').blocks).toEqual([
      '<heading>**a</>',
      '<paragraph>b**</>',
    ]);
    expect(importMarkdown('**a\n- b**').blocks).toEqual([
      '<paragraph>**a</>',
      '<list><listitem>b**</></>',
    ]);
  });

  it('leaves an unmatched delimiter literal', () => {
    expect(importMarkdown('**a\nb').blocks).toEqual(['<paragraph>**a|b</>']);
    expect(importMarkdown('a * b\nc * d').blocks).toEqual([
      '<paragraph>a * b|c * d</>',
    ]);
  });

  it('does not format across lines when newlines are preserved', () => {
    expect(importMarkdown('**a\nb**', true).blocks).toEqual([
      '<paragraph>**a</>',
      '<paragraph>b**</>',
    ]);
  });

  it('still unescapes text on every line', () => {
    expect(importMarkdown('\\*a\nb\\*').blocks).toEqual([
      '<paragraph>*a|b*</>',
    ]);
  });
});
