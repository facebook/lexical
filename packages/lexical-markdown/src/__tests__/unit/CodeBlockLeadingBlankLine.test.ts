/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeNode, CodeNode} from '@lexical/code-core';
import {createHeadlessEditor} from '@lexical/headless';
import {LinkNode} from '@lexical/link';
import {ListItemNode, ListNode} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$getRoot} from 'lexical';
import {describe, expect, it} from 'vitest';

function createEditor() {
  return createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
    onError: error => {
      throw error;
    },
  });
}

function importCodeText(markdown: string): string {
  const editor = createEditor();
  let text: string | null = null;
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
      const first = $getRoot().getFirstChild();
      text = $isCodeNode(first) ? first.getTextContent() : null;
    },
    {discrete: true},
  );
  return text as unknown as string;
}

function roundTrip(markdown: string): string {
  const editor = createEditor();
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

describe('code block leading blank lines', () => {
  it('keeps a blank first line of a fenced code block', () => {
    expect(importCodeText('```js\n\ncode\n```')).toBe('\ncode');
  });

  it('keeps several blank first lines', () => {
    expect(importCodeText('```js\n\n\na\nb\n```')).toBe('\n\na\nb');
  });

  it('round trips a code block that starts with a blank line', () => {
    const markdown = '```js\n\ncode\n```';
    expect(roundTrip(markdown)).toBe(markdown);
  });

  it('still drops nothing from a code block without leading blank lines', () => {
    expect(importCodeText('```js\ncode\n```')).toBe('code');
    expect(roundTrip('```js\ncode\n```')).toBe('```js\ncode\n```');
  });

  it('still treats text after the opening fence as content', () => {
    expect(importCodeText('``` code\nmore\n```')).toBe('code\nmore');
    expect(importCodeText('```javascript Incomplete tag')).toBe(
      'Incomplete tag',
    );
  });
});
