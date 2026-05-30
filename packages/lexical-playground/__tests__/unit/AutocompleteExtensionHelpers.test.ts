/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, test} from 'vitest';

import {
  createWordlistDictionary,
  detectLanguage,
  extractTrailingWord,
  getCompositionTextFromDOM,
} from '../../src/plugins/AutocompleteExtension';

describe('detectLanguage', () => {
  test.for([
    {expected: 'en', input: 'hello', label: 'ascii'},
    {expected: 'en', input: '', label: 'empty'},
    {expected: 'ko', input: '안녕', label: 'hangul'},
    {expected: 'ko', input: 'hi 안녕', label: 'mixed, hangul-trailing'},
    {expected: 'ja', input: 'あり', label: 'hiragana'},
    {expected: 'ja', input: 'カタカナ', label: 'katakana'},
    {expected: 'ja', input: '漢字', label: 'CJK Unified ideograph'},
    {
      expected: 'en',
      input: '안녕 hi',
      label: 'mixed, ascii-trailing',
    },
    {
      expected: 'ko',
      input: '안녕\u200B',
      label: 'trailing ZWSP skipped',
    },
    {
      expected: 'ko',
      input: '안녕\uFEFF',
      label: 'trailing BOM skipped',
    },
  ])('$label → $expected', ({input, expected}) => {
    expect(detectLanguage(input)).toBe(expected);
  });
});

describe('extractTrailingWord', () => {
  test.for([
    {expected: 'word', input: 'word', label: 'single word'},
    {expected: 'word', input: 'hello word', label: 'trailing word'},
    {expected: '', input: '', label: 'empty'},
    {expected: '', input: '   ', label: 'whitespace only'},
    {
      expected: '사용',
      input: 'foo 사용',
      label: 'hangul trailing word',
    },
    {
      expected: '사용',
      input: 'foo 사용\u00A0',
      label: 'NBSP trailing (Safari Korean IME)',
    },
    {
      expected: '日本',
      input: 'foo 日本\u3000',
      label: 'IDEOGRAPHIC SPACE trailing',
    },
    {
      expected: 'word',
      input: 'word\u00A0',
      label: 'NBSP at end, no leading whitespace',
    },
  ])('$label', ({input, expected}) => {
    expect(extractTrailingWord(input)).toBe(expected);
  });
});

describe('getCompositionTextFromDOM', () => {
  test('reads text from plain TextNode children', () => {
    const span = document.createElement('span');
    span.appendChild(document.createTextNode('hello'));
    expect(getCompositionTextFromDOM(span)).toBe('hello');
  });

  test('reads text from nested element children', () => {
    const span = document.createElement('span');
    const inner = document.createElement('span');
    inner.textContent = 'composed';
    span.appendChild(inner);
    expect(getCompositionTextFromDOM(span)).toBe('composed');
  });

  test('excludes elements marked with the autocomplete ghost attribute', () => {
    const span = document.createElement('span');
    span.appendChild(document.createTextNode('사용'));
    const ghost = document.createElement('span');
    ghost.setAttribute('data-autocomplete-ghost', 'true');
    ghost.textContent = '권 (TAB)';
    span.appendChild(ghost);
    expect(getCompositionTextFromDOM(span)).toBe('사용');
  });

  test('strips ZWSP and BOM that browsers scatter into composition spans', () => {
    const span = document.createElement('span');
    span.appendChild(document.createTextNode('\u200B사용\u200B'));
    expect(getCompositionTextFromDOM(span)).toBe('사용');
  });
});

describe('createWordlistDictionary', () => {
  const words = ['testimonials', 'testing', 'umbrella'];

  test('returns the suffix of the first matching word', () => {
    const dict = createWordlistDictionary(words);
    expect(dict.query('test')).toBe('imonials');
  });

  test('returns null below minPrefixLength', () => {
    const dict = createWordlistDictionary(words, {minPrefixLength: 4});
    expect(dict.query('tes')).toBeNull();
    expect(dict.query('test')).toBe('imonials');
  });

  test('returns null when no entry starts with the prefix', () => {
    const dict = createWordlistDictionary(words);
    expect(dict.query('zebra')).toBeNull();
  });

  test('returns null when the prefix equals an entry (no remaining suffix)', () => {
    const dict = createWordlistDictionary(words);
    expect(dict.query('umbrella')).toBeNull();
  });

  test('case-insensitive match by default — uppercase prefix resolves', () => {
    const dict = createWordlistDictionary(words);
    expect(dict.query('TEST')).toBe('imonials');
  });

  test('case-sensitive mode skips entries that differ in case', () => {
    const dict = createWordlistDictionary(words, {caseSensitive: true});
    expect(dict.query('TEST')).toBeNull();
    expect(dict.query('test')).toBe('imonials');
  });

  test('exposes minPrefixLength on the instance', () => {
    const dict = createWordlistDictionary(words, {minPrefixLength: 3});
    expect(dict.minPrefixLength).toBe(3);
  });
});
