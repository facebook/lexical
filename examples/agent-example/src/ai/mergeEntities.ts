/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export interface NERToken {
  entity: string;
  index: number;
  score: number;
  word: string;
}

export interface MergedEntity {
  end: number;
  entity: string;
  score: number;
  start: number;
  text: string;
}

/**
 * Compute character-level start/end offsets for each NER token.
 *
 * The transformers.js token-classification pipeline does not provide
 * character offsets (it's a TODO in the library). We reconstruct them
 * by walking the tokens in order and finding each token's `word` in the
 * original text. WordPiece continuation tokens (prefixed with `##`) are
 * matched without a preceding word boundary.
 *
 * The `index` field on each token is the position in the tokenizer's
 * full token sequence (including special tokens like [CLS] at index 0
 * in the numbering, though those are filtered from the output).
 */
export function computeTokenOffsets(
  tokens: NERToken[],
  text: string,
): Array<NERToken & {end: number; start: number}> {
  const result: Array<NERToken & {end: number; start: number}> = [];
  let cursor = 0;
  const lowerText = text.toLowerCase();

  for (const token of tokens) {
    const isSubword = token.word.startsWith('##');
    const stripped = isSubword ? token.word.slice(2) : token.word;
    const lowerStripped = stripped.toLowerCase();

    // For non-subword tokens, find the next occurrence at a word boundary
    // For subword tokens, continue immediately from cursor (no gap)
    if (!isSubword) {
      let idx = cursor;
      while (idx < lowerText.length) {
        idx = lowerText.indexOf(lowerStripped, idx);
        if (idx === -1) {
          break;
        }
        // Accept if at start of text or preceded by a non-alphanumeric char
        if (idx === 0 || !/[a-zA-Z0-9]/.test(text[idx - 1])) {
          break;
        }
        idx += 1; // skip this false match and keep searching
      }
      if (idx === -1 || idx >= lowerText.length) {
        continue; // skip token if we can't find it
      }
      cursor = idx;
    }

    const start = cursor;
    const end = cursor + stripped.length;
    cursor = end;

    result.push({...token, end, start});
  }
  return result;
}

/**
 * Merge BIO-tagged tokens into contiguous entity spans.
 *
 * Tokens use the BIO tagging scheme where `B-LOC` starts a new location
 * entity and `I-LOC` continues the previous one. WordPiece subword tokens
 * (prefixed with `##`) are handled by `computeTokenOffsets` so that
 * multi-token entities like "San Francisco" or "Gannaway" (split into
 * `"G"`, `"##anna"`, `"##way"`) produce a single span.
 *
 * @example
 * ```
 * [B-LOC "New", I-LOC "York"] → [{text: "New York", start: 0, end: 8, entity: "LOC"}]
 * ```
 */
export function mergeEntities(
  tokens: NERToken[],
  text: string,
): MergedEntity[] {
  const withOffsets = computeTokenOffsets(tokens, text);

  const merged: Array<{
    end: number;
    entity: string;
    minScore: number;
    start: number;
  }> = [];

  for (const token of withOffsets) {
    const prefix = token.entity.slice(0, 2); // "B-" or "I-"
    const label = token.entity.slice(2); // "LOC", "PER", etc.
    const isSubword = token.word.startsWith('##');

    // WordPiece subword tokens (##prefix) are always continuations of
    // the previous token, even if the NER model incorrectly tags them
    // as B- (beginning). This happens with names like "Maksim" where
    // the model produces B-PER "Ma", B-PER "##ks", B-PER "##im".
    const isContinuation = prefix === 'I-' || (isSubword && merged.length > 0);

    if (!isContinuation) {
      merged.push({
        end: token.end,
        entity: label,
        minScore: token.score,
        start: token.start,
      });
    } else if (merged.length > 0) {
      const last = merged[merged.length - 1];
      // For subwords, always extend the previous entity regardless of label
      // For I- tokens, only extend if the label matches
      if (isSubword || last.entity === label) {
        last.end = token.end;
        last.minScore = Math.min(last.minScore, token.score);
      }
    }
  }

  return merged.map((m) => ({
    end: m.end,
    entity: m.entity,
    score: m.minScore,
    start: m.start,
    text: text.slice(m.start, m.end),
  }));
}
