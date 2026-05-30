/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Pluggable dictionary for {@link AutocompleteExtension}.
 *
 * Implement this to plug a new language (or a custom matcher) into the
 * extension. The extension picks a dictionary by language-tag and calls
 * {@link query} with the prefix the user has typed; the returned suffix
 * is shown as the ghost suggestion.
 *
 * Adding a language without writing a custom implementation: prepare a
 * flat `readonly string[]` and pass it to {@link createWordlistDictionary}.
 * For custom logic (e.g. hiragana → kanji conversion or a remote
 * autocomplete service), implement this interface directly.
 */
export interface AutocompleteDictionary {
  /**
   * Minimum prefix length before {@link query} is consulted. The
   * extension never calls `query` with a shorter prefix, so short
   * prefixes don't waste a scan / round-trip.
   */
  readonly minPrefixLength: number;
  /**
   * Resolve `prefix` to a suggestion suffix (the trailing characters to
   * display as the ghost) or `null` if no suggestion is available.
   *
   * For example, with the prefix `'test'` and a wordlist containing
   * `'testimonials'`, the implementation returns `'imonials'`.
   *
   * The extension shows one suggestion at a time; implementations
   * should pick the longest / highest-priority match.
   */
  query(prefix: string): null | string;
}

export interface WordlistDictionaryOptions {
  /** Minimum prefix length before {@link AutocompleteDictionary.query} fires. Default `2`. */
  minPrefixLength?: number;
  /** Compare the prefix and the wordlist entries case-sensitively. Default `false`. */
  caseSensitive?: boolean;
}

/**
 * Create a simple {@link AutocompleteDictionary} backed by a flat
 * wordlist. Returns the first word in the list that starts with the
 * prefix (and is longer than it), case-insensitive by default.
 *
 * Case-insensitive matching assumes case folding preserves length,
 * which holds for the scripts this targets (Latin, Hangul, kana, Han).
 * Scripts where `toLowerCase()` changes length — e.g. Turkish `İ`
 * (U+0130) folds to two code points — are not handled specially; pass
 * `caseSensitive: true` for wordlists in those scripts.
 *
 * For most languages this is the minimum useful implementation. Plug
 * one in as:
 *
 * ```ts
 * configExtension(AutocompleteExtension, {
 *   dictionaries: {
 *     ja: createWordlistDictionary(JAPANESE_WORDS),
 *   },
 * });
 * ```
 */
export function createWordlistDictionary(
  words: readonly string[],
  options: WordlistDictionaryOptions = {},
): AutocompleteDictionary {
  const {minPrefixLength = 2, caseSensitive = false} = options;
  const fold = (text: string): string =>
    caseSensitive ? text : text.toLowerCase();
  // Index the wordlist for prefix lookups with a single integer of
  // overhead per word. `order` holds the word indices sorted by their
  // case-folded text, so the words sharing any given prefix form one
  // contiguous block. `query` binary-searches for the start of that
  // block and scans it for the earliest-listed (highest-priority) word
  // longer than the prefix — the same word a linear `Array.find` scan
  // would return, but without scanning the whole list. Folded text is
  // only needed to build the order and is recomputed on the fly during
  // lookup, so nothing but `order` (a `Uint32Array`) is retained.
  const folded = words.map(fold);
  const order = Uint32Array.from(
    words
      .map((_, index) => index)
      .sort((a, b) =>
        folded[a] < folded[b] ? -1 : folded[a] > folded[b] ? 1 : a - b,
      ),
  );
  return {
    minPrefixLength,
    query(prefix: string): null | string {
      if (prefix.length < minPrefixLength) {
        return null;
      }
      const needle = fold(prefix);
      // Lower bound: first position whose folded word is >= needle.
      let lo = 0;
      let hi = order.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (fold(words[order[mid]]) < needle) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      // Scan the contiguous block of words that start with `needle` for
      // the earliest-listed entry strictly longer than the prefix.
      let bestIndex = -1;
      let bestWord: string | null = null;
      for (let k = lo; k < order.length; k++) {
        const index = order[k];
        const word = words[index];
        if (!fold(word).startsWith(needle)) {
          break;
        }
        if (
          word.length > prefix.length &&
          (bestIndex === -1 || index < bestIndex)
        ) {
          bestIndex = index;
          bestWord = word;
        }
      }
      return bestWord === null ? null : bestWord.substring(prefix.length);
    },
  };
}
