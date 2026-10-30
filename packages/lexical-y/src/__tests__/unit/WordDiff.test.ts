/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {expect, test} from 'vitest';

import {diffWords, graphemeStarts, wordCut} from '../../internal/Inline';

// diffWords starts its walks where the two texts part. These walk word by
// word from the ends instead, as it did before, and must agree with it.
const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;
const charStart = (s: string, i: number) =>
  i > 0 && isLow(s.charCodeAt(i)) && isHigh(s.charCodeAt(i - 1)) ? i - 1 : i;
const charLength = (s: string, i: number) =>
  i + 1 < s.length && isHigh(s.charCodeAt(i)) && isLow(s.charCodeAt(i + 1))
    ? 2
    : 1;

function walkWords(a: string, b: string, endFirst: boolean) {
  const startsA = graphemeStarts(a);
  const startsB = graphemeStarts(b);
  const end = (s: string, starts: Uint8Array | null, i: number) => {
    let k = i + charLength(s, i);
    while (k < s.length && !wordCut(s, k, starts)) {
      k += charLength(s, k);
    }
    return k;
  };
  const start = (s: string, starts: Uint8Array | null, j: number) => {
    let k = charStart(s, j - 1);
    while (k > 0 && !wordCut(s, k, starts)) {
      k = charStart(s, k - 1);
    }
    return k;
  };
  const max = Math.min(a.length, b.length);
  const fromStart = (limit: number) => {
    let p = 0;
    while (p < limit) {
      const e = end(a, startsA, p);
      if (
        e > limit ||
        end(b, startsB, p) !== e ||
        a.slice(p, e) !== b.slice(p, e)
      ) {
        break;
      }
      p = e;
    }
    return p;
  };
  const fromEnd = (limit: number) => {
    let q = 0;
    while (q < limit) {
      const n = a.length - q - start(a, startsA, a.length - q);
      if (
        q + n > limit ||
        b.length - q - start(b, startsB, b.length - q) !== n ||
        a.slice(a.length - q - n, a.length - q) !==
          b.slice(b.length - q - n, b.length - q)
      ) {
        break;
      }
      q += n;
    }
    return q;
  };
  if (endFirst) {
    const suffix = fromEnd(max);
    return {prefix: fromStart(max - suffix), suffix};
  }
  const prefix = fromStart(max);
  return {prefix, suffix: fromEnd(max - prefix)};
}

// Letters, spaces and punctuation, and what joins: marks, joiners,
// stacking signs, prepend signs, emoji parts and regional indicators,
// characters that share a high or a low surrogate, and lone surrogates.
const ALPHABET = [
  'a',
  'b',
  ' ',
  '.',
  '_',
  '1',
  '\n',
  '\u0301',
  '\u200d',
  '\u200c',
  '\u00ad',
  '\u2060',
  '\ufffc',
  '\u0915',
  '\u094d',
  '\u17d2',
  '\u0e33',
  '\u0600',
  '\u3042',
  '\uff9e',
  '\u4e00',
  '\ud800',
  '\udc00',
  '\u{113d1}',
  '\u{1d165}',
  '\u{10400}',
  '\u{20400}',
  '\u{1f44b}',
  '\u{1f469}',
  '\u{1f4bb}',
  '\u{1f3fb}',
  '\u{1f1e6}',
  '\u{1f1fa}',
  '\u{1f1f8}',
];

test('diffWords gives what a walk from the ends gives', () => {
  let state = 9;
  const random = (n: number) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) % n;
  };
  const text = (n: number) => {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += ALPHABET[random(ALPHABET.length)];
    }
    return out;
  };
  for (let round = 0; round < 4000; round++) {
    const head = text(random(10));
    const tail = text(random(10));
    const a = head + text(random(5)) + tail;
    const b = round % 4 === 0 ? head + tail : head + text(random(5)) + tail;
    for (const endFirst of [false, true]) {
      expect([a, b, endFirst, diffWords(a, b, endFirst)]).toEqual([
        a,
        b,
        endFirst,
        walkWords(a, b, endFirst),
      ]);
    }
  }
});
