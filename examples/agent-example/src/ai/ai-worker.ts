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

let activeAbortController: AbortController | null = null;

self.onmessage = async (event: MessageEvent) => {
  const {type, id, messages, maxTokens} = event.data;

  if (type === 'abort') {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    return;
  }

  if (type !== 'generate') {
    return;
  }

  // Abort any previous in-flight request
  if (activeAbortController) {
    activeAbortController.abort();
  }
  const abortController = new AbortController();
  activeAbortController = abortController;

  try {
    const gen = await getGenerator();
    if (abortController.signal.aborted) {
      return;
    }
    self.postMessage({id, status: 'generating', type: 'status'});

    const streamer = new TextStreamer(gen.tokenizer, {
      callback_function: (token: string) => {
        if (!abortController.signal.aborted) {
          self.postMessage({id, token, type: 'token'});
        }
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

    if (abortController.signal.aborted) {
      return;
    }

    const result = Array.isArray(output) ? output[0] : output;
    const generatedMessages = (result as {generated_text: unknown})
      .generated_text;
    const lastMessage = Array.isArray(generatedMessages)
      ? generatedMessages[generatedMessages.length - 1]
      : null;
    const fullText =
      lastMessage && typeof lastMessage === 'object' && 'content' in lastMessage
        ? String(lastMessage.content)
        : '';

    self.postMessage({fullText: fullText.trim(), id, type: 'done'});
  } catch (err: unknown) {
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
