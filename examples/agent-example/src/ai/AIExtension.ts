/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {signal} from '@lexical/extension';
import {
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ESCAPE_COMMAND,
  mergeRegister,
} from 'lexical';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ChatMessage {
  content: string;
  role: 'system' | 'user' | 'assistant';
}

const REWRITE_STYLES: Record<string, string> = {
  casual: 'more casual and conversational',
  concise: 'more concise and to the point',
  formal: 'more formal and professional',
  simpler: 'simpler and easier to understand',
};

function buildRewriteMessages(text: string, style: string): ChatMessage[] {
  const styleDescription = REWRITE_STYLES[style] || style;
  return [
    {
      content: `You are a writing assistant. Rewrite the text to be ${styleDescription}. Return ONLY the rewritten text with no explanations or preamble.`,
      role: 'system',
    },
    {
      content: `Rewrite this text to be ${styleDescription}:\n\n${text}`,
      role: 'user',
    },
  ];
}

function buildGenerateMessages(context: string): ChatMessage[] {
  if (context.trim()) {
    return [
      {
        content:
          'You are a writing assistant. Continue the text naturally with one new paragraph. Write only the new paragraph, nothing else.',
        role: 'system',
      },
      {
        content: `Continue this text with one paragraph:\n\n${context}`,
        role: 'user',
      },
    ];
  }
  return [
    {
      content:
        'You are a writing assistant. Write a single interesting opening paragraph for an article. Write only the paragraph, nothing else.',
      role: 'system',
    },
    {
      content: 'Write an opening paragraph.',
      role: 'user',
    },
  ];
}

function createAIState() {
  const isGenerating = signal(false);
  const modelStatus = signal<ModelStatus>('idle');
  const loadProgress = signal<number | null>(null);

  let worker: Worker | null = null;
  let activeId: string | null = null;
  let tokenCallback: ((token: string) => void) | null = null;
  let requestCounter = 0;
  const pending = new Map<
    string,
    {reject: (err: Error) => void; resolve: (text: string | null) => void}
  >();

  function getWorker(): Worker {
    if (worker) {
      return worker;
    }
    const w = new Worker(new URL('./ai-worker.ts', import.meta.url), {
      type: 'module',
    });
    w.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'status') {
        if (data.status === 'loading-model') {
          modelStatus.value = 'loading';
          if (data.progress != null) {
            loadProgress.value = Math.round(data.progress);
          }
        } else if (data.status === 'model-ready') {
          modelStatus.value = 'ready';
          loadProgress.value = null;
        } else if (data.status === 'generating') {
          isGenerating.value = true;
        }
      } else if (data.type === 'token') {
        if (data.id === activeId && tokenCallback) {
          tokenCallback(data.token);
        }
      } else if (data.type === 'done') {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          if (data.id === activeId) {
            isGenerating.value = false;
            tokenCallback = null;
            activeId = null;
            p.resolve(data.fullText);
          } else {
            p.resolve(null);
          }
        }
      } else if (data.type === 'aborted') {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          p.resolve(null);
        }
        if (data.id === activeId) {
          isGenerating.value = false;
          tokenCallback = null;
          activeId = null;
        }
      } else if (data.type === 'error') {
        const p = pending.get(data.id);
        if (p) {
          pending.delete(data.id);
          if (data.id === activeId) {
            isGenerating.value = false;
            tokenCallback = null;
            activeId = null;
            modelStatus.value = 'error';
            p.reject(new Error(data.message));
          } else {
            p.resolve(null);
          }
        }
      }
    };
    worker = w;
    return w;
  }

  function abort(): void {
    if (activeId) {
      if (worker) {
        worker.postMessage({type: 'abort'});
      }
      const p = pending.get(activeId);
      if (p) {
        pending.delete(activeId);
        p.resolve(null);
      }
      activeId = null;
      tokenCallback = null;
      isGenerating.value = false;
    }
  }

  function sendRequest(
    messages: ChatMessage[],
    maxTokens: number,
    onToken?: (token: string) => void,
  ): Promise<string | null> {
    const w = getWorker();
    const id = `req_${++requestCounter}`;
    activeId = id;
    tokenCallback = onToken ?? null;
    return new Promise((resolve, reject) => {
      pending.set(id, {reject, resolve});
      w.postMessage({id, maxTokens, messages, type: 'generate'});
    });
  }

  function rewrite(text: string, style: string): Promise<string | null> {
    return sendRequest(buildRewriteMessages(text, style), 512);
  }

  function generateParagraph(
    context: string,
    onToken: (token: string) => void,
  ): Promise<string | null> {
    return sendRequest(buildGenerateMessages(context), 256, onToken);
  }

  function dispose(): void {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  return {
    abort,
    dispose,
    generateParagraph,
    isGenerating,
    loadProgress,
    modelStatus,
    rewrite,
  };
}

export type AIExtensionOutput = ReturnType<typeof createAIState>;

export const AIExtension = defineExtension({
  build() {
    return createAIState();
  },
  name: '@lexical/agent-example/ai',
  register(_editor, _config, state) {
    const output = state.getOutput();
    return mergeRegister(
      _editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          if (output.isGenerating.peek()) {
            output.abort();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      () => output.dispose(),
    );
  },
});
