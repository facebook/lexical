/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Script-range helpers. Add a new entry when introducing a new language;
// the BMP ranges below cover the common ones for IME-using languages.

function isHangul(cp: number): boolean {
  return (
    (cp >= 0xac00 && cp <= 0xd7af) || // Hangul Syllables
    (cp >= 0x1100 && cp <= 0x11ff) || // Hangul Jamo
    (cp >= 0x3130 && cp <= 0x318f) || // Hangul Compatibility Jamo
    (cp >= 0xa960 && cp <= 0xa97f) // Hangul Jamo Extended-A
  );
}

function isJapaneseKana(cp: number): boolean {
  return (
    (cp >= 0x3040 && cp <= 0x309f) || // Hiragana
    (cp >= 0x30a0 && cp <= 0x30ff) || // Katakana
    (cp >= 0x31f0 && cp <= 0x31ff) // Katakana Phonetic Extensions
  );
}

function isCJKUnified(cp: number): boolean {
  return cp >= 0x4e00 && cp <= 0x9fff;
}

function isZeroWidthOrControl(cp: number): boolean {
  // C0 controls (excluding tab/newline irrelevant here) + Unicode
  // zero-width formatting characters that browsers / IMEs scatter for
  // caret positioning during composition.
  return (
    cp < 0x20 ||
    (cp >= 0x200b && cp <= 0x200f) || // ZWSP, ZWNJ, ZWJ, LRM, RLM
    (cp >= 0x202a && cp <= 0x202e) || // bidi formatting
    cp === 0xfeff // BOM
  );
}

/**
 * Default language detection for {@link AutocompletePlugin}. Walks the
 * code points of `text` from the end, skipping zero-width and control
 * characters, and returns a language tag matching the dictionary key
 * the plugin should query.
 *
 * Returns `'en'` for ASCII / Latin (the catch-all), `'ko'` for Hangul,
 * and `'ja'` for both kana-bearing prefixes and prefixes whose last
 * visible codepoint is a CJK Unified Ideograph. The CJK Unified range
 * is shared between Japanese kanji and Chinese hanzi; the default
 * dictionary set covers English and Korean only, so kana and CJK
 * Unified prefixes produce no suggestion until a host registers a
 * dictionary under the `ja` (or `zh`) key. Japanese is omitted from
 * the defaults because the platform IMEs already provide their own
 * dropdown autocompletion. Hosts that need to distinguish Chinese
 * from Japanese should pass a custom `detectLanguage` that uses
 * application context (locale, user preference).
 */
export function detectLanguage(text: string): string {
  for (let i = text.length - 1; i >= 0; i--) {
    const cp = text.codePointAt(i);
    if (cp === undefined || isZeroWidthOrControl(cp)) {
      continue;
    }
    if (isHangul(cp)) {
      return 'ko';
    }
    if (isJapaneseKana(cp) || isCJKUnified(cp)) {
      return 'ja';
    }
    return 'en';
  }
  return 'en';
}
