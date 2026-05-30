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
  // Trie keyed on the case-folded character; each terminal stores the
  // original word so the returned suffix preserves the source casing.
  // Traversal order matches `words` insertion (Map iteration), so
  // `query` returns the earliest-listed match for a prefix — same
  // semantics as the previous linear scan, but O(prefix.length) per
  // lookup instead of O(N * prefix.length).
  const root: TrieNode = {children: new Map(), word: null};
  for (const word of words) {
    const key = caseSensitive ? word : word.toLowerCase();
    let node = root;
    for (const char of key) {
      let child = node.children.get(char);
      if (child === undefined) {
        child = {children: new Map(), word: null};
        node.children.set(char, child);
      }
      node = child;
    }
    if (node.word === null) {
      node.word = word;
    }
  }
  return {
    minPrefixLength,
    query(prefix: string): null | string {
      if (prefix.length < minPrefixLength) {
        return null;
      }
      const needle = caseSensitive ? prefix : prefix.toLowerCase();
      let node = root;
      for (const char of needle) {
        const next = node.children.get(char);
        if (next === undefined) {
          return null;
        }
        node = next;
      }
      const match = findFirstSuggestion(node, prefix.length);
      return match === null ? null : match.substring(prefix.length);
    },
  };
}

interface TrieNode {
  children: Map<string, TrieNode>;
  word: string | null;
}

function findFirstSuggestion(
  node: TrieNode,
  prefixLength: number,
): string | null {
  if (node.word !== null && node.word.length > prefixLength) {
    return node.word;
  }
  for (const child of node.children.values()) {
    const found = findFirstSuggestion(child, prefixLength);
    if (found !== null) {
      return found;
    }
  }
  return null;
}
