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
  type TextMatchTransformer,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$getRoot, $isTextNode} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('a code span', () => {
  // CommonMark: backslash escapes don't work in code spans.
  it.each([
    ['`\\*`', '\\*'],
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

  it('leaves the text after it to read its escapes', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => $convertFromMarkdownString('`\\*` \\* &#160;', TRANSFORMERS),
      {discrete: true},
    );
    expect(
      editor.read(() =>
        $getRoot()
          .getAllTextNodes()
          .map(node => [node.getTextContent(), node.hasFormat('code')]),
      ),
    ).toEqual([
      ['\\*', true],
      [' * \u00a0', false],
    ]);
  });
});

describe('formatted text', () => {
  // Each backslash escape is read once, in formatted text and beside a
  // text match such as a link.
  it.each([
    ['**a\\\\\\*b**', 'a\\*b'],
    ['a\\\\\\*b [x](https://y)', 'a\\*b x'],
  ])('reads %j as %j', (markdown, text) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
  });
});

describe('text a text match leaves in place', () => {
  it.each(['@a\\*b', 'x @a\\*b'])(
    'reads its escapes when the transformer edits it in place: %j',
    markdown => {
      const MENTION: TextMatchTransformer = {
        dependencies: [],
        importRegExp: /@\S+/,
        regExp: /@\S+$/,
        replace: node => {
          node.setFormat('bold');
        },
        type: 'text-match',
      };
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(() => $convertFromMarkdownString(markdown, [MENTION]), {
        discrete: true,
      });
      expect(
        editor.read(() =>
          $getRoot()
            .getAllTextNodes()
            .map(node => [node.getTextContent(), node.hasFormat('bold')]),
        ),
      ).toEqual([
        ...(markdown.startsWith('x') ? [['x ', false]] : []),
        ['@a*b', true],
      ]);
    },
  );
});
