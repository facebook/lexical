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
import {$getRoot, $isTextNode} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('a code span', () => {
  // CommonMark: backslash escapes don't work in code spans.
  it.each([
    ['`a\\|b`', 'a\\|b'],
    ['`a\\\\b`', 'a\\\\b'],
    ['`\\*`', '\\*'],
    ['x `a\\*b` y', 'x a\\*b y'],
    ['**`\\*`**', '\\*'],
  ])('keeps its backslashes in %j', (markdown, text) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    editor.read(() => {
      expect($getRoot().getTextContent()).toBe(text);
      const code = $getRoot()
        .getAllTextNodes()
        .find(node => node.hasFormat('code'));
      expect($isTextNode(code)).toBe(true);
      expect($convertToMarkdownString(TRANSFORMERS)).toBe(markdown);
    });
  });
});

describe('formatted text', () => {
  // Each backslash escape is read once, however deeply it is formatted.
  it.each([
    ['**a\\\\\\*b**', 'a\\*b'],
    ['*a\\\\\\*b*', 'a\\*b'],
    ['~~a\\\\\\*b~~', 'a\\*b'],
    ['***a\\\\\\*b***', 'a\\*b'],
    ['**x** a\\\\\\*b', 'x a\\*b'],
    ['a\\\\\\*b', 'a\\*b'],
  ])('reads %j as %j', (markdown, text) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
  });
});
