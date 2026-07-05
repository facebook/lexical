/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {assert, describe, expect, test} from 'vitest';

import {urlMatcher} from '../../src/plugins/AutoLinkExtension';

describe('urlMatcher', () => {
  test.each([
    ['https://google.com', 'https://google.com'],
    ['www.example.com', 'www.example.com'],
    ['https://example.com/path?q=1#hash', 'https://example.com/path?q=1#hash'],
    ['https://example.com:8080/api', 'https://example.com:8080/api'],
  ])('matches ASCII URL %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.text).toBe(expected);
  });

  test.each([
    ['https://qabilah.com/posts/عربي', 'https://qabilah.com/posts/عربي'],
    ['https://예시.한국', 'https://예시.한국'],
    ['https://пример.рф', 'https://пример.рф'],
    ['https://例子.中国/测试', 'https://例子.中国/测试'],
    ['http://예시.한국/경로?키=값#부분', 'http://예시.한국/경로?키=값#부분'],
    [
      'http://مثال.موقع/مسار?مفتاح=قيمة#قسم',
      'http://مثال.موقع/مسار?مفتاح=قيمة#قسم',
    ],
  ])('matches Unicode URL %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.text).toBe(expected);
  });

  test.each([
    ['hello https://google.com world', 'https://google.com'],
    [
      'مرحبا https://qabilah.com/posts/عربي end',
      'https://qabilah.com/posts/عربي',
    ],
    ['텍스트 https://예시.한국 끝', 'https://예시.한국'],
    ['go www.예시.한국 end', 'www.예시.한국'],
  ])('extracts URL from surrounding text: %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.text).toBe(expected);
  });

  test.each([
    ['see https://google.com, ok', 'https://google.com'],
    ['see https://google.com. ok', 'https://google.com'],
    ['see https://예시.한국, ok', 'https://예시.한국'],
    ['see https://예시.한국. ok', 'https://예시.한국'],
  ])('excludes trailing punctuation: %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.text).toBe(expected);
  });

  test.each([
    ['(https://google.com)', 'https://google.com'],
    ['(https://예시.한국)', 'https://예시.한국'],
    [
      'https://en.wikipedia.org/wiki/Fish_(disambiguation)',
      'https://en.wikipedia.org/wiki/Fish_(disambiguation)',
    ],
    ['https://example.com/a_(b_(c))', 'https://example.com/a_(b_(c))'],
  ])('handles parentheses correctly: %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.text).toBe(expected);
  });

  test.each([
    ['www.example.com', 'https://www.example.com'],
    ['www.예시.한국', 'https://www.예시.한국'],
    ['https://google.com', 'https://google.com'],
    ['http://пример.рф', 'http://пример.рф'],
  ])('sets correct url for %s', (input, expected) => {
    const result = urlMatcher(input);
    assert(result !== null);
    expect(result.url).toBe(expected);
  });

  test.each(['just text no url', 'http:// alone', ''])(
    'returns null for non-URL: %s',
    input => {
      expect(urlMatcher(input)).toBeNull();
    },
  );
});
