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

import {getCodeSpanDelimiter} from '../../MarkdownTransformers';
import {MarkdownTestExtension} from '../utils';

function roundTrip(markdown: string): string {
  using editor = buildEditorFromExtensions([MarkdownTestExtension]);
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    {discrete: true},
  );
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

// https://spec.commonmark.org/0.31.2/#code-spans
describe('inline code that holds only whitespace (#9405)', () => {
  it('does not pad content of only spaces', () => {
    expect(getCodeSpanDelimiter(' ')).toEqual({fence: '`', padded: ' '});
    expect(getCodeSpanDelimiter('  ')).toEqual({fence: '`', padded: '  '});
  });

  it('still pads content that a reader would strip', () => {
    expect(getCodeSpanDelimiter(' a ')).toEqual({fence: '`', padded: '  a  '});
    expect(getCodeSpanDelimiter('\t')).toEqual({fence: '`', padded: ' \t '});
    expect(getCodeSpanDelimiter(' \t ')).toEqual({
      fence: '`',
      padded: '  \t  ',
    });
  });

  it('round trips a code span of only spaces unchanged', () => {
    for (const markdown of ['` `', '`  `', 'a ` ` b']) {
      expect(roundTrip(markdown)).toBe(markdown);
      expect(roundTrip(roundTrip(markdown))).toBe(markdown);
    }
  });

  it('keeps the formats around a code span of only spaces', () => {
    expect(roundTrip('**` `**')).toBe('**` `**');
    expect(roundTrip('*` `* x')).toBe('*` `* x');
    expect(roundTrip('~~`  `~~')).toBe('~~`  `~~');
  });

  it('leaves code spans with other content unchanged', () => {
    expect(roundTrip('` a `')).toBe('`a`');
    expect(roundTrip('`  a  `')).toBe('`  a  `');
    expect(roundTrip('`a`')).toBe('`a`');
    expect(roundTrip('**`a`** b')).toBe('**`a`** b');
  });
});
