/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* eslint-disable no-restricted-globals */

import {
  pipeline,
  TextGenerationPipeline,
  TextStreamer,
  TokenClassificationPipeline,
} from '@huggingface/transformers';

import {mergeEntities, type NERToken} from './mergeEntities';

let generator: TextGenerationPipeline | null = null;
let nerClassifier: TokenClassificationPipeline | null = null;

async function getGenerator(): Promise<TextGenerationPipeline> {
  if (generator) {
    return generator;
  }
  self.postMessage({status: 'loading-model', type: 'status'});
  generator = await pipeline<'text-generation'>(
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

async function getNERClassifier(): Promise<TokenClassificationPipeline> {
  if (nerClassifier) {
    return nerClassifier;
  }
  self.postMessage({status: 'loading-ner', type: 'status'});
  nerClassifier = await pipeline<'token-classification'>(
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
      const raw = await classifier(text, {
        ignore_labels: ['O'],
      });
      // Handle both single and array results
      const results = Array.isArray(raw) ? raw : [raw];
      const entities = mergeEntities(results as NERToken[], text);
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
