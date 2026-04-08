/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, test} from 'vitest';

import {
  computeTokenOffsets,
  mergeEntities,
  type NERToken,
} from '../../ai/mergeEntities';

const SAMPLE_TEXT =
  'Lexical was created by Dominic Gannaway in London while working at Meta and is now maintained by Bob Ippolito in San Francisco along with Gerard Rovira and Maksim Horbachevsky in New York. Ivaylo Pavlov at Bloomberg in London built the table and drag-and-drop plugins, James Fitzsimmons in Melbourne contributed collaborative editing through Atticus, and Alessio Gravili in Vancouver contributed while working at Figma.';

// Real raw output from Xenova/bert-base-NER via transformers.js.
// The `index` field is the position in the tokenizer's full token
// sequence (index 0 = [CLS], so content tokens start at 1+).
const RAW_NER_TOKENS: NERToken[] = [
  {entity: 'B-PER', index: 6, score: 0.9997073411941528, word: 'Dominic'},
  {entity: 'I-PER', index: 7, score: 0.9995349049568176, word: 'G'},
  {entity: 'I-PER', index: 8, score: 0.9992656111717224, word: '##anna'},
  {entity: 'I-PER', index: 9, score: 0.9991829991340637, word: '##way'},
  {entity: 'B-LOC', index: 11, score: 0.9994244575500488, word: 'London'},
  {entity: 'B-ORG', index: 15, score: 0.9961370229721069, word: 'Met'},
  {entity: 'I-ORG', index: 16, score: 0.9791027903556824, word: '##a'},
  {entity: 'B-PER', index: 22, score: 0.9997095465660095, word: 'Bob'},
  {entity: 'I-PER', index: 23, score: 0.9995977282524109, word: 'I'},
  {entity: 'I-PER', index: 24, score: 0.9992127418518066, word: '##pp'},
  {entity: 'I-PER', index: 25, score: 0.9745029211044312, word: '##oli'},
  {entity: 'I-PER', index: 26, score: 0.9754385948181152, word: '##to'},
  {entity: 'B-LOC', index: 28, score: 0.9991046190261841, word: 'San'},
  {entity: 'I-LOC', index: 29, score: 0.9994170069694519, word: 'Francisco'},
  {entity: 'B-PER', index: 32, score: 0.9997550249099731, word: 'Gerard'},
  {entity: 'I-PER', index: 33, score: 0.9995988011360168, word: 'R'},
  {entity: 'I-PER', index: 34, score: 0.9987411499023438, word: '##ov'},
  {entity: 'I-PER', index: 35, score: 0.9705546498298645, word: '##ira'},
  {entity: 'B-PER', index: 37, score: 0.9995468258857727, word: 'Ma'},
  {entity: 'B-PER', index: 38, score: 0.9969091415405273, word: '##ks'},
  {entity: 'B-PER', index: 39, score: 0.9985908269882202, word: '##im'},
  {entity: 'I-PER', index: 40, score: 0.9996759295463562, word: 'Ho'},
  {entity: 'I-PER', index: 41, score: 0.9920862913131714, word: '##rb'},
  {entity: 'I-PER', index: 42, score: 0.9949511885643005, word: '##ache'},
  {entity: 'I-PER', index: 43, score: 0.8672780394554138, word: '##vsky'},
  {entity: 'B-LOC', index: 45, score: 0.9989475011825562, word: 'New'},
  {entity: 'I-LOC', index: 46, score: 0.9994460344314575, word: 'York'},
  {entity: 'B-PER', index: 48, score: 0.9996358752250671, word: 'I'},
  {entity: 'B-PER', index: 49, score: 0.5895915627479553, word: '##va'},
  {entity: 'I-PER', index: 50, score: 0.9850192666053772, word: '##yl'},
  {entity: 'I-PER', index: 51, score: 0.9969282150268555, word: '##o'},
  {entity: 'I-PER', index: 52, score: 0.999713122844696, word: 'Pa'},
  {entity: 'I-PER', index: 53, score: 0.9916881322860718, word: '##v'},
  {entity: 'I-PER', index: 54, score: 0.9954679608345032, word: '##lov'},
  {entity: 'B-ORG', index: 56, score: 0.9976635575294495, word: 'Bloomberg'},
  {entity: 'B-LOC', index: 58, score: 0.9995514750480652, word: 'London'},
  {entity: 'B-PER', index: 71, score: 0.9997419714927673, word: 'James'},
  {entity: 'I-PER', index: 72, score: 0.9997224807739258, word: 'Fi'},
  {entity: 'I-PER', index: 73, score: 0.9536916017532349, word: '##tz'},
  {entity: 'I-PER', index: 74, score: 0.9845725893974304, word: '##si'},
  {entity: 'I-PER', index: 75, score: 0.8684886693954468, word: '##mm'},
  {entity: 'I-PER', index: 76, score: 0.7130764722824097, word: '##ons'},
  {entity: 'B-LOC', index: 78, score: 0.9993162155151367, word: 'Melbourne'},
  {entity: 'B-ORG', index: 83, score: 0.8499583601951599, word: 'At'},
  {entity: 'I-ORG', index: 84, score: 0.38718655705451965, word: '##ticus'},
  {entity: 'B-PER', index: 87, score: 0.9992861151695251, word: 'Al'},
  {entity: 'I-PER', index: 88, score: 0.9911989569664001, word: '##ess'},
  {entity: 'B-PER', index: 89, score: 0.8856533765792847, word: '##io'},
  {entity: 'I-PER', index: 90, score: 0.9996274709701538, word: 'G'},
  {entity: 'I-PER', index: 91, score: 0.9980586171150208, word: '##ra'},
  {entity: 'I-PER', index: 92, score: 0.9964310526847839, word: '##vili'},
  {entity: 'B-LOC', index: 94, score: 0.9988622069358826, word: 'Vancouver'},
  {entity: 'B-ORG', index: 99, score: 0.9932615160942078, word: 'Fi'},
  {entity: 'I-ORG', index: 100, score: 0.978778600692749, word: '##gma'},
];

describe('computeTokenOffsets', () => {
  test('computes offsets for simple single-word tokens', () => {
    const tokens: NERToken[] = [
      {entity: 'B-LOC', index: 3, score: 0.99, word: 'London'},
    ];
    const result = computeTokenOffsets(tokens, 'Visit London today');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({end: 12, start: 6, word: 'London'});
  });

  test('computes offsets for WordPiece subword tokens', () => {
    const tokens: NERToken[] = [
      {entity: 'B-ORG', index: 3, score: 0.99, word: 'Met'},
      {entity: 'I-ORG', index: 4, score: 0.98, word: '##a'},
    ];
    const result = computeTokenOffsets(tokens, 'working at Meta');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({end: 14, start: 11, word: 'Met'});
    expect(result[1]).toMatchObject({end: 15, start: 14, word: '##a'});
    // Together they cover "Meta" (11-15) in "working at Meta"
    //                                          0123456789012345
  });

  test('handles multi-token names split by WordPiece', () => {
    // "Gannaway" → "G", "##anna", "##way"
    const tokens: NERToken[] = [
      {entity: 'B-PER', index: 2, score: 0.99, word: 'Dominic'},
      {entity: 'I-PER', index: 3, score: 0.99, word: 'G'},
      {entity: 'I-PER', index: 4, score: 0.99, word: '##anna'},
      {entity: 'I-PER', index: 5, score: 0.99, word: '##way'},
    ];
    const result = computeTokenOffsets(tokens, 'by Dominic Gannaway in');
    expect(result).toHaveLength(4);
    // "Dominic" at 3-10
    expect(result[0]).toMatchObject({end: 10, start: 3});
    // "G" at 11, "anna" at 12-16, "way" at 16-19
    expect(result[1]).toMatchObject({end: 12, start: 11});
    expect(result[2]).toMatchObject({end: 16, start: 12});
    expect(result[3]).toMatchObject({end: 19, start: 16});
  });

  test('case-insensitive matching', () => {
    const tokens: NERToken[] = [
      {entity: 'B-LOC', index: 1, score: 0.99, word: 'london'},
    ];
    const result = computeTokenOffsets(tokens, 'Visit London today');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({end: 12, start: 6});
  });

  test('skips tokens that cannot be found in text', () => {
    const tokens: NERToken[] = [
      {entity: 'B-LOC', index: 1, score: 0.99, word: 'Paris'},
      {entity: 'B-LOC', index: 5, score: 0.99, word: 'London'},
    ];
    const result = computeTokenOffsets(tokens, 'Visit London today');
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe('London');
  });

  test('handles real NER output from the sample text', () => {
    const result = computeTokenOffsets(RAW_NER_TOKENS, SAMPLE_TEXT);
    // All tokens should be found
    expect(result).toHaveLength(RAW_NER_TOKENS.length);

    // Spot-check key offsets
    const dominic = result[0];
    expect(dominic.word).toBe('Dominic');
    expect(SAMPLE_TEXT.slice(dominic.start, dominic.end)).toBe('Dominic');

    // "Gannaway" is split into "G" + "##anna" + "##way"
    const gStart = result[1].start;
    const gEnd = result[3].end;
    expect(SAMPLE_TEXT.slice(gStart, gEnd)).toBe('Gannaway');

    // "London" (first occurrence)
    const london1 = result[4];
    expect(london1.word).toBe('London');
    expect(SAMPLE_TEXT.slice(london1.start, london1.end)).toBe('London');
    expect(london1.start).toBe(SAMPLE_TEXT.indexOf('London'));

    // "Meta" split as "Met" + "##a"
    const metStart = result[5].start;
    const metEnd = result[6].end;
    expect(SAMPLE_TEXT.slice(metStart, metEnd)).toBe('Meta');

    // "San Francisco" across two tokens
    const sanStart = result[12].start;
    const franEnd = result[13].end;
    expect(SAMPLE_TEXT.slice(sanStart, franEnd)).toBe('San Francisco');

    // Second "London" (should find the second occurrence)
    const london2 = result.find(
      (t) => t.word === 'London' && t.start > london1.start,
    );
    expect(london2).toBeDefined();
    expect(SAMPLE_TEXT.slice(london2!.start, london2!.end)).toBe('London');
    expect(london2!.start).toBe(SAMPLE_TEXT.indexOf('London', london1.end));
  });
});

describe('mergeEntities', () => {
  test('merges simple B-I sequence into one entity', () => {
    const tokens: NERToken[] = [
      {entity: 'B-LOC', index: 1, score: 0.99, word: 'New'},
      {entity: 'I-LOC', index: 2, score: 0.98, word: 'York'},
    ];
    const result = mergeEntities(tokens, 'in New York today');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      end: 11,
      entity: 'LOC',
      start: 3,
      text: 'New York',
    });
  });

  test('keeps separate B- tokens as distinct entities', () => {
    const tokens: NERToken[] = [
      {entity: 'B-LOC', index: 1, score: 0.99, word: 'London'},
      {entity: 'B-LOC', index: 5, score: 0.98, word: 'Paris'},
    ];
    const result = mergeEntities(tokens, 'London and Paris');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({entity: 'LOC', text: 'London'});
    expect(result[1]).toMatchObject({entity: 'LOC', text: 'Paris'});
  });

  test('does not merge I- tokens with different entity labels', () => {
    const tokens: NERToken[] = [
      {entity: 'B-PER', index: 1, score: 0.99, word: 'Bob'},
      {entity: 'I-LOC', index: 2, score: 0.98, word: 'London'},
    ];
    const result = mergeEntities(tokens, 'Bob London');
    // "Bob" is B-PER, "London" is I-LOC (mismatched label) → only "Bob"
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({entity: 'PER', text: 'Bob'});
  });

  test('drops leading I- tokens with no preceding B-', () => {
    const tokens: NERToken[] = [
      {entity: 'I-LOC', index: 1, score: 0.99, word: 'York'},
      {entity: 'B-LOC', index: 3, score: 0.98, word: 'London'},
    ];
    const result = mergeEntities(tokens, 'York and London');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({entity: 'LOC', text: 'London'});
  });

  test('score is the minimum across merged tokens', () => {
    const tokens: NERToken[] = [
      {entity: 'B-PER', index: 1, score: 0.95, word: 'Bob'},
      {entity: 'I-PER', index: 2, score: 0.8, word: 'I'},
      {entity: 'I-PER', index: 3, score: 0.9, word: '##pp'},
      {entity: 'I-PER', index: 4, score: 0.85, word: '##oli'},
      {entity: 'I-PER', index: 5, score: 0.7, word: '##to'},
    ];
    const result = mergeEntities(tokens, 'Bob Ippolito');
    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0.7);
  });

  test('merges WordPiece subwords into single entity span', () => {
    const tokens: NERToken[] = [
      {entity: 'B-ORG', index: 3, score: 0.99, word: 'Met'},
      {entity: 'I-ORG', index: 4, score: 0.97, word: '##a'},
    ];
    const result = mergeEntities(tokens, 'working at Meta here');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      end: 15,
      entity: 'ORG',
      start: 11,
      text: 'Meta',
    });
  });

  test('handles full real NER output from sample text', () => {
    const result = mergeEntities(RAW_NER_TOKENS, SAMPLE_TEXT);

    // Extract just entity+text for readability
    const summary = result.map((e) => ({entity: e.entity, text: e.text}));

    expect(summary).toEqual([
      {entity: 'PER', text: 'Dominic Gannaway'},
      {entity: 'LOC', text: 'London'},
      {entity: 'ORG', text: 'Meta'},
      {entity: 'PER', text: 'Bob Ippolito'},
      {entity: 'LOC', text: 'San Francisco'},
      {entity: 'PER', text: 'Gerard Rovira'},
      // NER model tags "Maksim" as B-PER "Ma", B-PER "##ks", B-PER "##im"
      // but ## subwords are always treated as continuations regardless of B- tag
      {entity: 'PER', text: 'Maksim Horbachevsky'},
      {entity: 'LOC', text: 'New York'},
      // "Ivaylo" split as B-PER "I", B-PER "##va" — ## forces continuation
      {entity: 'PER', text: 'Ivaylo Pavlov'},
      {entity: 'ORG', text: 'Bloomberg'},
      {entity: 'LOC', text: 'London'},
      {entity: 'PER', text: 'James Fitzsimmons'},
      {entity: 'LOC', text: 'Melbourne'},
      {entity: 'ORG', text: 'Atticus'},
      // "Alessio" split as B-PER "Al", I-PER "##ess", B-PER "##io"
      // ## subwords continue, so this merges into one entity
      {entity: 'PER', text: 'Alessio Gravili'},
      {entity: 'LOC', text: 'Vancouver'},
      {entity: 'ORG', text: 'Figma'},
    ]);
  });

  test('verifies character offsets match sliced text', () => {
    const result = mergeEntities(RAW_NER_TOKENS, SAMPLE_TEXT);

    for (const entity of result) {
      expect(SAMPLE_TEXT.slice(entity.start, entity.end)).toBe(entity.text);
    }
  });

  test('all offsets are within text bounds', () => {
    const result = mergeEntities(RAW_NER_TOKENS, SAMPLE_TEXT);

    for (const entity of result) {
      expect(entity.start).toBeGreaterThanOrEqual(0);
      expect(entity.end).toBeLessThanOrEqual(SAMPLE_TEXT.length);
      expect(entity.start).toBeLessThan(entity.end);
    }
  });

  test('entities are in document order (non-overlapping)', () => {
    const result = mergeEntities(RAW_NER_TOKENS, SAMPLE_TEXT);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].start).toBeGreaterThanOrEqual(result[i - 1].end);
    }
  });
});
