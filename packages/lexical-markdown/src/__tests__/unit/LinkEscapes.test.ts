/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createLinkNode} from '@lexical/link';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalNode,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('link syntax in text', () => {
  it.each([
    [
      'text that reads as a link',
      () => [$createTextNode('[x\\](b)')],
      '[x\\\\\\](b)',
    ],
    [
      'a bracket after a backslash in link text',
      () => [$createLinkNode('u').append($createTextNode('x\\]'))],
      '[x\\\\\\]](u)',
    ],
    [
      'a "!" after a backslash before a link',
      () => [
        $createTextNode('a\\!'),
        $createLinkNode('u').append($createTextNode('l')),
      ],
      'a\\\\\\![l](u)',
    ],
  ])(
    'round-trips %s when backslashes are kept',
    (_, $build: () => LexicalNode[], written: string) => {
      using editor = buildEditorFromExtensions([MarkdownTestExtension]);
      editor.update(
        () =>
          $getRoot()
            .clear()
            .append($createParagraphNode().append(...$build())),
        {discrete: true},
      );
      const json = JSON.stringify(editor.getEditorState().toJSON());
      const markdown = editor.read(() =>
        $convertToMarkdownString(TRANSFORMERS, undefined, true),
      );
      expect(markdown).toBe(written);
      editor.update(
        () =>
          $convertFromMarkdownString(markdown, TRANSFORMERS, undefined, true),
        {discrete: true},
      );
      expect(JSON.stringify(editor.getEditorState().toJSON())).toBe(json);
    },
  );
});
