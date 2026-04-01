/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {pipeline, TextStreamer} from '@huggingface/transformers';

type TextGenerationPipeline = Awaited<
  ReturnType<typeof pipeline<'text-generation'>>
>;

let generator: TextGenerationPipeline | null = null;

async function getGenerator(): Promise<TextGenerationPipeline> {
  if (generator) {
    return generator;
  }
  self.postMessage({type: 'status', status: 'loading-model'});
  generator = await pipeline(
    'text-generation',
    'HuggingFaceTB/SmolLM2-135M-Instruct',
    {
      dtype: 'q4',
      device: 'wasm',
      progress_callback: (progress: {progress?: number; status?: string}) => {
        self.postMessage({
          progress: progress.progress ?? null,
          status: progress.status ?? 'loading-model',
          type: 'status',
        });
      },
    },
  );
  self.postMessage({type: 'status', status: 'model-ready'});
  return generator;
}

self.onmessage = async (event: MessageEvent) => {
  const {type, id, messages, maxTokens} = event.data;

  if (type !== 'generate') {
    return;
  }

  try {
    const gen = await getGenerator();
    self.postMessage({id, status: 'generating', type: 'status'});

    const streamer = new TextStreamer(gen.tokenizer, {
      callback_function: (token: string) => {
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

    const result = Array.isArray(output) ? output[0] : output;
    const generatedMessages = result.generated_text;
    const lastMessage = Array.isArray(generatedMessages)
      ? generatedMessages[generatedMessages.length - 1]
      : null;
    const fullText = lastMessage
      ? (lastMessage as {content: string}).content
      : '';

    self.postMessage({fullText: fullText.trim(), id, type: 'done'});
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({id, message, type: 'error'});
  }
};
