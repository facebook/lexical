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
    {expected: 'ja', input: '㐀', label: 'CJK Extension A (BMP)'},
    {
      expected: 'ja',
      input: '\u{20000}',
      label: 'supplementary-plane CJK ideograph (Ext B)',
    },
    {
      expected: 'ja',
      input: 'foo \u{20000}',
      label: 'trailing supplementary-plane ideograph after ascii',
    },
    {
      expected: 'en',
      input: '\u{1F642}',
      label: 'astral emoji is not a CJK/Hangul script',
    },
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

  // The list is a priority order (most-common / highest-ranked first), so
  // `query` must return the *earliest-listed* completion for a prefix —
  // never merely the shortest one that happens to share it.
  test('returns the earliest-listed match, not the shortest, for nested words', () => {
    // 'conditions' precedes the shorter 'condition' it contains; the
    // earlier entry must still win.
    const dict = createWordlistDictionary(['conditions', 'condition'], {
      minPrefixLength: 4,
    });
    expect(dict.query('cond')).toBe('itions');
  });

  test('a sorted nested pair resolves to the earlier (shorter) entry', () => {
    const dict = createWordlistDictionary(['condition', 'conditions'], {
      minPrefixLength: 4,
    });
    expect(dict.query('cond')).toBe('ition');
  });

  test('picks the highest-priority of several matches at each prefix length', () => {
    const dict = createWordlistDictionary(['apply', 'apple', 'application']);
    expect(dict.query('app')).toBe('ly');
    expect(dict.query('appl')).toBe('y');
  });

  test('a word equal to the prefix is never its own suggestion', () => {
    // 'form' leaves no suffix, so the longer 'formal' answers instead.
    const dict = createWordlistDictionary(['form', 'formal']);
    expect(dict.query('form')).toBe('al');
  });

  test('returns null when the only match equals the prefix', () => {
    const dict = createWordlistDictionary(['form']);
    expect(dict.query('form')).toBeNull();
  });

  test('returns null for a prefix longer than every entry', () => {
    const dict = createWordlistDictionary(['test']);
    expect(dict.query('testing')).toBeNull();
  });

  test('an empty wordlist yields no suggestions', () => {
    const dict = createWordlistDictionary([]);
    expect(dict.query('anything')).toBeNull();
  });

  test('builds and queries multi-byte (Hangul) words', () => {
    const dict = createWordlistDictionary(['사용', '사용법', '사용자']);
    expect(dict.query('사용')).toBe('법'); // 사용법 is listed first
    expect(dict.query('사')).toBeNull(); // below the default minPrefixLength
  });

  test('matches case-insensitively while preserving the source casing in the suffix', () => {
    const dict = createWordlistDictionary(['JavaScript']);
    expect(dict.query('java')).toBe('Script');
    expect(dict.query('JAVA')).toBe('Script');
  });

  test('minPrefixLength shortens the set of queryable prefixes', () => {
    const dict = createWordlistDictionary(['testing'], {minPrefixLength: 4});
    expect(dict.query('tes')).toBeNull();
    expect(dict.query('test')).toBe('ing');
  });

  test('duplicate entries are handled and the first occurrence wins', () => {
    const dict = createWordlistDictionary(['testing', 'testing', 'tester']);
    expect(dict.query('test')).toBe('ing');
  });
});

describe('createWordlistDictionary — Korean (non-ASCII) wordlist', () => {
  // A small slice of real multi-syllable Korean nouns. Several share the
  // '사용' ("use") and '학' ("study / school") stems, so prefix lookups,
  // priority order, and minPrefixLength gating are all exercised on
  // Hangul rather than ASCII. Hangul syllables are single UTF-16 units,
  // so a two-syllable prefix has length 2.
  const koreanWords = [
    '사용', // use
    '사용법', // instructions
    '사용자', // user
    '학교', // school
    '학생', // student
    '학생회', // student council
  ];

  test('completes a Hangul prefix to its earliest-listed longer word', () => {
    const dict = createWordlistDictionary(koreanWords);
    expect(dict.query('사용')).toBe('법'); // 사용법 precedes 사용자
    expect(dict.query('학생')).toBe('회'); // 학생회 is the only longer 학생*
  });

  test('respects the default minPrefixLength of 2 on Hangul', () => {
    const dict = createWordlistDictionary(koreanWords);
    expect(dict.query('사')).toBeNull(); // single syllable, below the minimum
    expect(dict.query('학')).toBeNull();
  });

  test('a complete word with no longer entry yields no suggestion', () => {
    const dict = createWordlistDictionary(koreanWords);
    expect(dict.query('학교')).toBeNull(); // 학교 is a leaf
  });

  test('returns null when no entry shares the Hangul prefix', () => {
    const dict = createWordlistDictionary(koreanWords);
    expect(dict.query('컴퓨')).toBeNull(); // 컴퓨터 (computer) is not in the list
  });

  test('honours the priority order among words sharing a stem', () => {
    // Re-ordered so 사용자 outranks 사용법; the earliest-listed wins.
    const dict = createWordlistDictionary(['사용자', '사용법', '사용권']);
    expect(dict.query('사용')).toBe('자');
  });

  test('a custom minPrefixLength gates shorter Hangul prefixes', () => {
    const dict = createWordlistDictionary(['학생회', '학생회장'], {
      minPrefixLength: 3,
    });
    expect(dict.query('학생')).toBeNull(); // 2 syllables < 3
    expect(dict.query('학생회')).toBe('장'); // 3-syllable prefix completes
  });
});
