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
import {describe, expect, it} from 'vitest';

import {MarkdownTestExtension} from '../utils';

describe('whitespace CommonMark strips from a block', () => {
  it.each([
    ['a\n   b\n\tc', 'a\nb\nc'],
    ['# h  \t', '# h'],
    ['foo  ', 'foo'],
    ['foo\\\n\nbar \n', 'foo\\\\\n\nbar'],
    ['> q  \n> r ', '> q  \n> r'],
    ['- x  \n- y\t', '- x\n- y'],
    ['`a` ', '`a`'],
    ['```\ncode  \n```', '```\ncode  \n```'],
  ])('reads %j as %j', (markdown, written) => {
    using editor = buildEditorFromExtensions([MarkdownTestExtension]);
    editor.update(() => $convertFromMarkdownString(markdown, TRANSFORMERS), {
      discrete: true,
    });
    expect(editor.read(() => $convertToMarkdownString(TRANSFORMERS))).toBe(
      written,
    );
  });
});
