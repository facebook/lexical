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
import {$convertFromMarkdownString, TRANSFORMERS} from '@lexical/markdown';
import {HeadingNode, QuoteNode} from '@lexical/rich-text';
import {$getRoot} from 'lexical';
import {describe, expect, it} from 'vitest';

function importCodeText(markdown: string): string | null {
  const editor = createHeadlessEditor({
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
    onError: error => {
      throw error;
    },
  });
  let text: string | null = null;
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
      const first = $getRoot().getFirstChild();
      text = $isCodeNode(first) ? first.getTextContent() : null;
    },
    {discrete: true},
  );
  return text;
}

describe('indented code fences', () => {
  it('removes the fence indentation from the content', () => {
    expect(importCodeText('  ```js\n  code\n  ```')).toBe('code');
  });

  it('preserves indentation relative to the fence', () => {
    expect(importCodeText('   ```\n   a\n     b\n   ```')).toBe('a\n  b');
  });

  it('removes at most the fence indentation', () => {
    expect(importCodeText('  ```\ncode\n  ```')).toBe('code');
    expect(importCodeText('  ```\n a\n  b\n  ```')).toBe('a\nb');
  });

  it('handles a tab-indented fence', () => {
    expect(importCodeText('\t```\n\tcode\n\t```')).toBe('code');
  });

  it('keeps content indentation when the fence is not indented', () => {
    expect(importCodeText('```js\n  code\n```')).toBe('  code');
    expect(importCodeText('```js\ncode\n```')).toBe('code');
  });
});
