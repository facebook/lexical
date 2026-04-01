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
  abort: () => void;
  generateParagraph: (
    context: string,
    onToken: (token: string) => void,
  ) => Promise<string | null>;
  isGenerating: boolean;
  loadProgress: number | null;
  makeBulletPoints: (text: string) => Promise<string | null>;
  modelStatus: ModelStatus;
}

let requestCounter = 0;

function buildBulletPointMessages(text: string): ChatMessage[] {
  return [
    {
      content:
        'You are a writing assistant. Convert the text into a bullet point list. Each bullet point should be a short phrase or sentence starting with "- ". Return ONLY the bullet points, one per line, with no other text.',
      role: 'system',
    },
    {
      content: `Convert this text into bullet points:\n\n${text}`,
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
  const tokenCallbackRef = useRef<((token: string) => void) | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const pendingRef = useRef<
    Map<
      string,
      {reject: (err: Error) => void; resolve: (text: string | null) => void}
    >
  >(new Map());

  const getWorker = useCallback(() => {
    if (workerRef.current) {
      return workerRef.current;
    }
    const worker = new Worker(new URL('./ai-worker.ts', import.meta.url), {
      type: 'module',
    });
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
        if (data.id === activeIdRef.current && tokenCallbackRef.current) {
          tokenCallbackRef.current(data.token);
        }
      } else if (data.type === 'done') {
        const pending = pendingRef.current.get(data.id);
        if (pending) {
          pendingRef.current.delete(data.id);
          if (data.id === activeIdRef.current) {
            setIsGenerating(false);
            tokenCallbackRef.current = null;
            activeIdRef.current = null;
            pending.resolve(data.fullText);
          } else {
            // Aborted request completed — ignore result
            pending.resolve(null);
          }
        }
      } else if (data.type === 'aborted') {
        // Worker confirmed abort — clean up if not already done
        const pending = pendingRef.current.get(data.id);
        if (pending) {
          pendingRef.current.delete(data.id);
          pending.resolve(null);
        }
        if (data.id === activeIdRef.current) {
          setIsGenerating(false);
          tokenCallbackRef.current = null;
          activeIdRef.current = null;
        }
      } else if (data.type === 'error') {
        const pending = pendingRef.current.get(data.id);
        if (pending) {
          pendingRef.current.delete(data.id);
          if (data.id === activeIdRef.current) {
            setIsGenerating(false);
            tokenCallbackRef.current = null;
            activeIdRef.current = null;
            setModelStatus('error');
            pending.reject(new Error(data.message));
          } else {
            pending.resolve(null);
          }
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

  const abort = useCallback(() => {
    if (activeIdRef.current) {
      // Tell the worker to stop inference
      if (workerRef.current) {
        workerRef.current.postMessage({type: 'abort'});
      }
      const pending = pendingRef.current.get(activeIdRef.current);
      if (pending) {
        pendingRef.current.delete(activeIdRef.current);
        pending.resolve(null);
      }
      activeIdRef.current = null;
      tokenCallbackRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const sendRequest = useCallback(
    (
      messages: ChatMessage[],
      maxTokens: number,
      onToken?: (token: string) => void,
    ): Promise<string | null> => {
      const worker = getWorker();
      const id = `req_${++requestCounter}`;
      activeIdRef.current = id;
      tokenCallbackRef.current = onToken ?? null;
      return new Promise((resolve, reject) => {
        pendingRef.current.set(id, {reject, resolve});
        worker.postMessage({id, maxTokens, messages, type: 'generate'});
      });
    },
    [getWorker],
  );

  const makeBulletPoints = useCallback(
    (text: string): Promise<string | null> => {
      return sendRequest(buildBulletPointMessages(text), 256);
    },
    [sendRequest],
  );

  const generateParagraph = useCallback(
    (
      context: string,
      onToken: (token: string) => void,
    ): Promise<string | null> => {
      return sendRequest(buildGenerateMessages(context), 256, onToken);
    },
    [sendRequest],
  );

  return {
    abort,
    generateParagraph,
    isGenerating,
    loadProgress,
    makeBulletPoints,
    modelStatus,
  };
}
