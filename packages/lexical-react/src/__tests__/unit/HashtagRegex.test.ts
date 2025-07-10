/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getHashtagRegexString} from '../../LexicalHashtagPlugin';

describe('Hashtag Regex', () => {
  const regex = new RegExp(getHashtagRegexString(), 'g');

  it('matches simple hashtag followed by space', () => {
    const text = 'Check this out #Lexical ';
    const matches = [...text.matchAll(regex)].map((m) => m[0].trim());
    expect(matches).toEqual(['#Lexical']);
  });

  it('matches simple hashtag followed by punctuation', () => {
    const text = 'Using #Editor!';
    const matches = [...text.matchAll(regex)].map((m) => m[0].trim());
    expect(matches).toEqual(['#Editor']);
  });

  it('ignores emoji hashtag followed by space', () => {
    const text = 'This should not be matched: #️⃣ ';
    const matches = [...text.matchAll(regex)].map((m) => m[0].trim());
    expect(matches).toEqual([]);
  });

  it('ignores emoji hashtag followed by text', () => {
    const text = 'Invalid hashtag: #️⃣test';
    const matches = [...text.matchAll(regex)].map((m) => m[0].trim());
    expect(matches).toEqual([]);
  });
});
