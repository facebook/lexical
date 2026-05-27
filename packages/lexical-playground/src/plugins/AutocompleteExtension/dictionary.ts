/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Pluggable dictionary for the autocomplete plugin.
 *
 * Implement this to plug a new language (or a custom matcher) into
 * {@link AutocompletePlugin}. The plugin picks a dictionary by
 * language-tag and calls {@link query} with the prefix the user has
 * typed; the returned suffix is shown as the ghost suggestion.
 *
 * Adding a language without writing a custom class: prepare a flat
 * `readonly string[]` of words and pass it to {@link WordlistDictionary}.
 * For custom logic (e.g. hiragana → kanji conversion or a remote
 * autocomplete service), implement this interface directly.
 */
export interface AutocompleteDictionary {
  /**
   * Minimum prefix length before {@link query} is consulted. The plugin
   * never calls `query` with a shorter prefix, so short prefixes don't
   * waste a scan / round-trip.
   */
  readonly minPrefixLength: number;
  /**
   * Resolve `prefix` to a suggestion suffix (the trailing characters to
   * display as the ghost) or `null` if no suggestion is available.
   *
   * For example, with the prefix `'test'` and a wordlist containing
   * `'testimonials'`, the implementation returns `'imonials'`.
   *
   * The plugin returns one suggestion at a time; implementations should
   * pick the longest / highest-priority match.
   */
  query(prefix: string): null | string;
}

/**
 * Simple `AutocompleteDictionary` backed by a flat wordlist. Returns
 * the first word in the list that starts with the prefix (and is
 * longer than it), case-insensitive by default.
 *
 * For most languages this is the minimum useful implementation. Plug
 * one in as:
 *
 * ```ts
 * <AutocompletePlugin
 *   dictionaries={{
 *     ...defaultDictionaries,
 *     ja: new WordlistDictionary(JAPANESE_WORDS),
 *   }}
 * />
 * ```
 */
export class WordlistDictionary implements AutocompleteDictionary {
  readonly minPrefixLength: number;
  private readonly words: readonly string[];
  private readonly caseSensitive: boolean;

  constructor(
    words: readonly string[],
    minPrefixLength: number = 2,
    caseSensitive: boolean = false,
  ) {
    this.words = words;
    this.minPrefixLength = minPrefixLength;
    this.caseSensitive = caseSensitive;
  }

  query(prefix: string): null | string {
    if (prefix.length < this.minPrefixLength) {
      return null;
    }
    const needle = this.caseSensitive ? prefix : prefix.toLowerCase();
    for (const word of this.words) {
      const candidate = this.caseSensitive ? word : word.toLowerCase();
      if (candidate.length > prefix.length && candidate.startsWith(needle)) {
        return word.substring(prefix.length);
      }
    }
    return null;
  }
}
