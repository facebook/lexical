/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useCallback, useEffect, useRef, useState} from 'react';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ChatMessage {
  content: string;
  role: 'system' | 'user' | 'assistant';
}

export interface UseAIReturn {
  generateParagraph: (context: string) => Promise<string>;
  isGenerating: boolean;
  loadProgress: number | null;
  modelStatus: ModelStatus;
  proofread: (text: string) => Promise<string>;
  streamingText: string;
}

let requestCounter = 0;

function buildProofreadMessages(text: string): ChatMessage[] {
  return [
    {
      content:
        'You are a proofreading assistant. Fix grammar, spelling, and punctuation errors in the text. Return ONLY the corrected text with no explanations or extra commentary.',
      role: 'system',
    },
    {
      content: `Proofread and correct this text:\n\n${text}`,
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

export function useAI(): UseAIReturn {
  const workerRef = useRef<Worker | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const pendingRef = useRef<
    Map<
      string,
      {reject: (err: Error) => void; resolve: (text: string) => void}
    >
  >(new Map());

  const getWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }
    const worker = new Worker(
      new URL('./ai-worker.ts', import.meta.url),
      {type: 'module'},
    );
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'status') {
        if (data.status === 'loading-model') {
          setModelStatus('loading');
          if (data.progress != null) {
            setLoadProgress(Math.round(data.progress));
          }
        } else if (data.status === 'model-ready') {
          setModelStatus('ready');
          setLoadProgress(null);
        } else if (data.status === 'generating') {
          setIsGenerating(true);
        }
      } else if (data.type === 'token') {
        setStreamingText((prev) => prev + data.token);
      } else if (data.type === 'done') {
        setIsGenerating(false);
        setStreamingText('');
        const pending = pendingRef.current.get(data.id);
        if (pending) {
          pending.resolve(data.fullText);
          pendingRef.current.delete(data.id);
        }
      } else if (data.type === 'error') {
        setIsGenerating(false);
        setStreamingText('');
        setModelStatus('error');
        const pending = pendingRef.current.get(data.id);
        if (pending) {
          pending.reject(new Error(data.message));
          pendingRef.current.delete(data.id);
        }
      }
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const sendRequest = useCallback(
    (messages: ChatMessage[], maxTokens: number): Promise<string> => {
      const worker = getWorker();
      const id = `req_${++requestCounter}`;
      setStreamingText('');
      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, {reject, resolve});
        worker.postMessage({id, maxTokens, messages, type: 'generate'});
      });
    },
    [getWorker],
  );

  const proofread = useCallback(
    (text: string): Promise<string> => {
      return sendRequest(buildProofreadMessages(text), 512);
    },
    [sendRequest],
  );

  const generateParagraph = useCallback(
    (context: string): Promise<string> => {
      return sendRequest(buildGenerateMessages(context), 256);
    },
    [sendRequest],
  );

  return {generateParagraph, isGenerating, loadProgress, modelStatus, proofread, streamingText};
}
