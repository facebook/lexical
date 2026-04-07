/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, signal} from '@lexical/extension';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTabNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  COMMAND_PRIORITY_LOW,
  defineExtension,
  KEY_ESCAPE_COMMAND,
  LexicalEditor,
  mergeRegister,
} from 'lexical';

import {
  $createAICaretNode,
  $isAICaretNode,
  AICaretNodeExtension,
} from '../nodes/AICaretNode';
import {$createEntityNode, EntityNodeExtension} from '../nodes/EntityNode';
import {
  $collectTextNodeOffsets,
  $replaceTextWithEntityNodes,
  replaceWithEntity,
} from '../utils/extractEntityNodes';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export const AI_GENERATE_START_TAG = 'ai-generate-start';
export const AI_STREAM_TAG = 'ai-stream';
export const AI_GENERATE_END_TAG = 'ai-generate-end';
export const AI_ENTITIES_TAG = 'ai-entities';

export interface ExtractedEntity {
  end: number;
  entity: string;
  score: number;
  start: number;
  text: string;
}

interface ChatMessage {
  content: string;
  role: 'system' | 'user' | 'assistant';
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

const WHITESPACE_RE = /[\n\t]/g;

function $appendTokenBeforeCaret(caretKey: string, token: string): void {
  const caret = $getNodeByKey(caretKey);
  if (!$isAICaretNode(caret)) {
    return;
  }
  let pos = 0;
  WHITESPACE_RE.lastIndex = 0;
  let match;
  while ((match = WHITESPACE_RE.exec(token)) !== null) {
    if (match.index > pos) {
      caret.insertBefore($createTextNode(token.slice(pos, match.index)));
    }
    caret.insertBefore(
      match[0] === '\n' ? $createLineBreakNode() : $createTabNode(),
    );
    pos = WHITESPACE_RE.lastIndex;
  }
  if (pos < token.length) {
    caret.insertBefore($createTextNode(token.slice(pos)));
  }
}

function $removeAICaret(caretKey: string): void {
  const caret = $getNodeByKey(caretKey);
  if ($isAICaretNode(caret) && caret.isAttached()) {
    caret.selectPrevious();
    caret.remove();
  }
}

export interface AIExtensionConfig {
  readonly createWorker: () => Worker;
}

function createAIState(editor: LexicalEditor, config: AIExtensionConfig) {
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
  const entityPending = new Map<
    string,
    {
      reject: (err: Error) => void;
      resolve: (entities: ExtractedEntity[]) => void;
    }
  >();

  function getWorker(): Worker {
    if (worker) {
      return worker;
    }
    const w = config.createWorker();
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
        } else if (
          data.status === 'loading-ner' ||
          data.status === 'ner-ready'
        ) {
          if (data.status === 'loading-ner') {
            modelStatus.value = 'loading';
            if (data.progress != null) {
              loadProgress.value = Math.round(data.progress);
            }
          } else {
            modelStatus.value = 'ready';
            loadProgress.value = null;
          }
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
      } else if (data.type === 'entities') {
        const ep = entityPending.get(data.id);
        if (ep) {
          entityPending.delete(data.id);
          isGenerating.value = false;
          ep.resolve(data.entities);
        }
      } else if (data.type === 'error') {
        const ep = entityPending.get(data.id);
        if (ep) {
          entityPending.delete(data.id);
          isGenerating.value = false;
          ep.reject(new Error(data.message));
          return;
        }
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
    stopAt?: string,
  ): Promise<string | null> {
    const w = getWorker();
    const id = `req_${++requestCounter}`;
    activeId = id;
    tokenCallback = onToken ?? null;
    return new Promise((resolve, reject) => {
      pending.set(id, {reject, resolve});
      w.postMessage({id, maxTokens, messages, stopAt, type: 'generate'});
    });
  }

  function extractEntitiesFromWorker(
    text: string,
    entityTypes?: string[],
  ): Promise<ExtractedEntity[]> {
    const w = getWorker();
    const id = `ner_${++requestCounter}`;
    isGenerating.value = true;
    return new Promise((resolve, reject) => {
      entityPending.set(id, {reject, resolve});
      w.postMessage({entityTypes, id, text, type: 'extract-entities'});
    });
  }

  function dispose(): void {
    if (worker) {
      worker.terminate();
      worker = null;
    }
  }

  async function handleGenerate(): Promise<string | null> {
    const context = editor.read(() => $getRoot().getTextContent());

    let caretKey: string | null = null;
    editor.update(
      () => {
        const caret = $createAICaretNode();
        $getRoot().append($createParagraphNode().append(caret));
        caretKey = caret.getKey();
      },
      {tag: AI_GENERATE_START_TAG},
    );

    try {
      const result = await sendRequest(
        buildGenerateMessages(context),
        256,
        (token: string) => {
          if (caretKey) {
            editor.update(() => $appendTokenBeforeCaret(caretKey!, token), {
              tag: AI_STREAM_TAG,
            });
          }
        },
        '\n\n',
      );
      return result;
    } finally {
      if (caretKey) {
        editor.update(() => $removeAICaret(caretKey!), {
          tag: AI_GENERATE_END_TAG,
        });
      }
    }
  }

  async function handleExtractEntities(): Promise<void> {
    const textInfo = editor.read($collectTextNodeOffsets);

    if (!textInfo.fullText.trim()) {
      return;
    }

    const entities = await extractEntitiesFromWorker(textInfo.fullText, [
      'LOC',
      'PER',
      'ORG',
    ]);
    if (entities.length === 0) {
      return;
    }
    editor.update(
      () => {
        $replaceTextWithEntityNodes(textInfo.textNodes, entities, {
          LOC: replaceWithEntity((text) => $createEntityNode('LOC', text)),
          ORG: replaceWithEntity((text) => $createEntityNode('ORG', text)),
          PER: replaceWithEntity((text) => $createEntityNode('PER', text)),
        });
      },
      {tag: AI_ENTITIES_TAG},
    );
  }

  return {
    abort,
    dispose,
    handleExtractEntities,
    handleGenerate,
    isGenerating,
    loadProgress,
    modelStatus,
  };
}

export type AIExtensionOutput = ReturnType<typeof createAIState>;

export function defaultCreateWorker(): Worker {
  return new Worker(new URL('./ai-worker.ts', import.meta.url), {
    type: 'module',
  });
}

export const AIExtension = defineExtension({
  build: createAIState,
  config: {createWorker: defaultCreateWorker} as AIExtensionConfig,
  dependencies: [AICaretNodeExtension, EntityNodeExtension],
  name: '@lexical/agent-example/ai',
  register(editor, _config, state) {
    const output = state.getOutput();
    return mergeRegister(
      output.dispose.bind(output),
      effect(() => {
        if (output.isGenerating.value) {
          return editor.registerCommand(
            KEY_ESCAPE_COMMAND,
            () => {
              output.abort();
              return true;
            },
            COMMAND_PRIORITY_LOW,
          );
        }
      }),
    );
  },
});
