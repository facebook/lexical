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
  $generateNodesFromMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$getRoot, $isParagraphNode} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  normalizeMarkdown,
  parseMarkdownHardLineBreak,
} from '../../MarkdownTransformers';
import {MarkdownTestExtension} from '../utils';

// Single-quoted TS strings: '\\' is one literal backslash.
const ONE = 'foo\\';
const TWO = 'foo\\\\';
const THREE = 'foo\\\\\\';

function importText(markdown: string): string {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  let text = '';
  editor.update(
    () => {
      $convertFromMarkdownString(
        markdown,
        TRANSFORMERS,
        undefined,
        false,
        true,
      );
      text = $getRoot().getTextContent();
    },
    {discrete: true},
  );
  return text;
}

describe('escaped backslash at end of line', () => {
  it('treats a lone trailing backslash as a hard line break', () => {
    expect(parseMarkdownHardLineBreak(ONE)).toEqual(['foo', '\\']);
  });

  it('does not treat an escaped backslash as a hard line break', () => {
    expect(parseMarkdownHardLineBreak(TWO)).toBe(null);
  });

  it('treats an odd run of backslashes as a hard line break', () => {
    expect(parseMarkdownHardLineBreak(THREE)).toEqual(['foo\\\\', '\\']);
  });

  it('still recognises the two-space hard line break', () => {
    expect(parseMarkdownHardLineBreak('foo  ')).toEqual(['foo', '  ']);
  });

  it('merges a line ending in an escaped backslash with the next line', () => {
    expect(normalizeMarkdown(TWO + '\nbar', true)).toBe(TWO + ' bar');
  });

  it.each(['foo  \r\nbar', 'foo\\\rbar'])(
    'reads a hard line break before a CR line ending in %j',
    markdown => {
      expect(importText(markdown)).toBe('foo\nbar');
    },
  );

  it('keeps a real hard line break unmerged', () => {
    expect(normalizeMarkdown(ONE + '\nbar', true)).toBe(ONE + '\nbar');
  });

  it('keeps the literal backslash in the imported text', () => {
    // `foo\\` is an escaped backslash, so the paragraph text is `foo\ bar`.
    expect(importText(TWO + '\nbar')).toBe('foo\\ bar');
  });

  // Lines are kept apart as line breaks, so the break's marker is what
  // export writes for it.
  it.each([
    [TWO, 'foo\\\nbar', 'foo\\\\\nbar'],
    [THREE, 'foo\\\nbar', 'foo\\\\\\\nbar'],
    [ONE, 'foo\nbar', 'foo\\\nbar'],
  ])('reads %j and the next line unmerged', (line, text, markdown) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(
      () => $convertFromMarkdownString(line + '\nbar', TRANSFORMERS),
      {discrete: true},
    );
    expect(editor.read(() => $getRoot().getTextContent())).toBe(text);
    expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
      markdown,
    );
  });

  it('reads a hard line break in nodes generated outside the root', () => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    let texts;
    editor.update(
      () => {
        const [paragraph] = $generateNodesFromMarkdownString(
          'foo\\\nbar\nbaz  \nqux',
          TRANSFORMERS,
        );
        texts = $assertNodeType(paragraph, $isParagraphNode)
          .getChildren()
          .map(node => node.getTextContent());
      },
      {discrete: true},
    );
    // The markers are taken off the text, as they are in the root.
    expect(texts).toEqual(['foo', '\n', 'bar', '\n', 'baz', '\n', 'qux']);
  });
});
