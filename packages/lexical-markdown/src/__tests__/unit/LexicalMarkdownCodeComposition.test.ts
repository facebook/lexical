/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, $isCodeNode, CodeNode} from '@lexical/code';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot} from 'lexical';
import {describe, expect, it} from 'vitest';

import {
  $convertFromMarkdownString,
  createMarkdownCodeBlockTransformer,
  TRANSFORMERS,
} from '../..';

const CODE = createMarkdownCodeBlockTransformer({
  $createCodeNode,
  $isCodeNode,
  dependencies: [CodeNode],
});
const TRANSFORMERS_WITH_CODE = [...TRANSFORMERS, CODE];
const FENCED_CODE_BLOCK_MARKDOWN = ['```js', 'const x = 1;', '```'].join('\n');

describe('Markdown Code Fence Composition', () => {
  it('imports fenced code blocks as paragraphs with core TRANSFORMERS', () => {
    const editor = createHeadlessEditor({nodes: [CodeNode]});

    editor.update(() => {
      $convertFromMarkdownString(FENCED_CODE_BLOCK_MARKDOWN, TRANSFORMERS);

      const root = $getRoot();
      expect(root.getChildrenSize()).toBe(1);

      const firstChild = root.getFirstChild();
      expect(firstChild).not.toBeNull();
      expect(firstChild?.getType()).toBe('paragraph');
    });
  });

  it('imports fenced code blocks as CodeNode with composed transformers', () => {
    const editor = createHeadlessEditor({nodes: [CodeNode]});

    editor.update(() => {
      $convertFromMarkdownString(
        FENCED_CODE_BLOCK_MARKDOWN,
        TRANSFORMERS_WITH_CODE,
      );

      const root = $getRoot();
      expect(root.getChildrenSize()).toBe(1);

      const firstChild = root.getFirstChild();
      expect(firstChild).not.toBeNull();
      expect(firstChild).toBeInstanceOf(CodeNode);
      expect(firstChild?.getType()).toBe('code');
    });
  });
});
