/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-restricted-globals */

import {pipeline, TextStreamer} from '@huggingface/transformers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nerClassifier: any = null;

async function getGenerator() {
  if (generator) {
    return generator;
  }
  self.postMessage({status: 'loading-model', type: 'status'});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generator = await (pipeline as any)(
    'text-generation',
    'HuggingFaceTB/SmolLM2-135M-Instruct',
    {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (progress: {progress?: number; status?: string}) => {
        self.postMessage({
          progress: progress.progress ?? null,
          status: progress.status ?? 'loading-model',
          type: 'status',
        });
      },
    },
  );
  self.postMessage({status: 'model-ready', type: 'status'});
  return generator;
}

async function getNERClassifier() {
  if (nerClassifier) {
    return nerClassifier;
  }
  self.postMessage({status: 'loading-ner', type: 'status'});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nerClassifier = await (pipeline as any)(
    'token-classification',
    'Xenova/bert-base-NER',
    {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (progress: {progress?: number; status?: string}) => {
        self.postMessage({
          progress: progress.progress ?? null,
          status: progress.status ?? 'loading-ner',
          type: 'status',
        });
      },
    },
  );
  self.postMessage({status: 'ner-ready', type: 'status'});
  return nerClassifier;
}

interface NERToken {
  entity: string;
  index: number;
  score: number;
  word: string;
}

/**
 * Compute character-level start/end offsets for each NER token.
 *
 * The transformers.js token-classification pipeline does not provide
 * character offsets (it's a TODO in the library). We reconstruct them
 * by walking the tokens in order and finding each token's `word` in the
 * original text. WordPiece continuation tokens (prefixed with `##`) are
 * matched without a preceding word boundary.
 */
function computeTokenOffsets(
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

    // For non-subword tokens, advance past whitespace to the next word
    // For subword tokens, continue immediately from cursor (no gap)
    if (!isSubword) {
      const idx = lowerText.indexOf(lowerStripped, cursor);
      if (idx === -1) {
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
 * e.g. [B-LOC "New", I-LOC "York"] → [{text: "New York", start: 0, end: 8, entity: "LOC"}]
 */
function mergeEntities(
  tokens: NERToken[],
  text: string,
): Array<{
  end: number;
  entity: string;
  score: number;
  start: number;
  text: string;
}> {
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

    if (prefix === 'B-') {
      merged.push({
        end: token.end,
        entity: label,
        minScore: token.score,
        start: token.start,
      });
    } else if (prefix === 'I-' && merged.length > 0) {
      const last = merged[merged.length - 1];
      if (last.entity === label) {
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

let activeAbortController: AbortController | null = null;

self.onmessage = async (event: MessageEvent) => {
  const {type, id} = event.data;

  if (type === 'abort') {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    return;
  }

  if (type === 'extract-entities') {
    const {text, entityTypes} = event.data;
    try {
      self.postMessage({id, status: 'generating', type: 'status'});
      const classifier = await getNERClassifier();
      const raw: NERToken[] = await classifier(text, {
        ignore_labels: ['O'],
      });
      const entities = mergeEntities(raw, text);
      const filtered = entityTypes
        ? entities.filter((e: {entity: string}) =>
            entityTypes.includes(e.entity),
          )
        : entities;
      self.postMessage({entities: filtered, id, type: 'entities'});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({id, message, type: 'error'});
    }
    return;
  }

  if (type !== 'generate') {
    return;
  }

  const {messages, maxTokens, stopAt} = event.data;

  // Abort any previous in-flight request
  if (activeAbortController) {
    activeAbortController.abort();
  }
  const abortController = new AbortController();
  activeAbortController = abortController;

  // Track accumulated text so we can stop early (e.g. after first paragraph)
  let accumulated = '';
  let stoppedEarly = false;

  try {
    const gen = await getGenerator();
    if (abortController.signal.aborted) {
      return;
    }
    self.postMessage({id, status: 'generating', type: 'status'});

    const streamer = new TextStreamer(gen.tokenizer, {
      callback_function: (token: string) => {
        if (abortController.signal.aborted) {
          return;
        }
        accumulated += token;
        // Stop generation when the stop pattern is found (e.g. "\n\n" for single paragraph)
        if (stopAt && accumulated.includes(stopAt)) {
          stoppedEarly = true;
          abortController.abort();
          return;
        }
        self.postMessage({id, token, type: 'token'});
      },
      skip_prompt: true,
      skip_special_tokens: true,
    });

    const output = await gen(messages, {
      do_sample: true,
      max_new_tokens: maxTokens || 256,
      streamer,
      temperature: 0.7,
    });

    if (abortController.signal.aborted && !stoppedEarly) {
      return;
    }

    let fullText: string;
    if (stoppedEarly) {
      // Use accumulated text up to the stop pattern
      const stopIndex = accumulated.indexOf(stopAt);
      fullText = accumulated.slice(0, stopIndex).trim();
    } else {
      const result = Array.isArray(output) ? output[0] : output;
      const generatedMessages = (result as {generated_text: unknown})
        .generated_text;
      const lastMessage = Array.isArray(generatedMessages)
        ? generatedMessages[generatedMessages.length - 1]
        : null;
      fullText =
        lastMessage &&
        typeof lastMessage === 'object' &&
        'content' in lastMessage
          ? String(lastMessage.content)
          : '';
    }

    self.postMessage({fullText: fullText.trim(), id, type: 'done'});
  } catch (err: unknown) {
    if (stoppedEarly) {
      // Early stop triggers abort which may throw — send the good text
      const stopIndex = accumulated.indexOf(stopAt);
      const fullText =
        stopIndex >= 0
          ? accumulated.slice(0, stopIndex).trim()
          : accumulated.trim();
      self.postMessage({fullText, id, type: 'done'});
      return;
    }
    if (abortController.signal.aborted) {
      self.postMessage({id, type: 'aborted'});
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({id, message, type: 'error'});
  } finally {
    if (activeAbortController === abortController) {
      activeAbortController = null;
    }
  }
};
