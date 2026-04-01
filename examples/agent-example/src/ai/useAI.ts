/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {effect, getExtensionDependencyFromEditor} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect, useMemo, useState} from 'react';

import {AIExtension} from './AIExtension';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseAIReturn {
  abort: () => void;
  generateParagraph: (
    context: string,
    onToken: (token: string) => void,
  ) => Promise<string | null>;
  isGenerating: boolean;
  loadProgress: number | null;
  modelStatus: ModelStatus;
  rewrite: (text: string, style: string) => Promise<string | null>;
}

export function useAI(): UseAIReturn {
  const [editor] = useLexicalComposerContext();
  const ai = useMemo(
    () => getExtensionDependencyFromEditor(editor, AIExtension).output,
    [editor],
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [modelStatus, setModelStatus] = useState<ModelStatus>(() =>
    ai.modelStatus.peek(),
  );
  const [loadProgress, setLoadProgress] = useState<number | null>(() =>
    ai.loadProgress.peek(),
  );

  useEffect(() => {
    return effect(() => {
      setIsGenerating(ai.isGenerating.value);
    });
  }, [ai]);

  useEffect(() => {
    return effect(() => {
      setModelStatus(ai.modelStatus.value);
    });
  }, [ai]);

  useEffect(() => {
    return effect(() => {
      setLoadProgress(ai.loadProgress.value);
    });
  }, [ai]);

  return {
    abort: ai.abort,
    generateParagraph: ai.generateParagraph,
    isGenerating,
    loadProgress,
    modelStatus,
    rewrite: ai.rewrite,
  };
}
