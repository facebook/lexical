/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useExtensionDependency} from '@lexical/react/useExtensionComponent';

import {useSignalValue} from '../utils/useExtensionHooks';
import {AIExtension} from './AIExtension';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseAIReturn {
  abort: () => void;
  handleExtractEntities: () => Promise<void>;
  handleGenerate: () => Promise<string | null>;
  isGenerating: boolean;
  loadProgress: number | null;
  modelStatus: ModelStatus;
}

export function useAI(): UseAIReturn {
  const ai = useExtensionDependency(AIExtension).output;
  const isGenerating = useSignalValue(ai.isGenerating);
  const modelStatus = useSignalValue(ai.modelStatus);
  const loadProgress = useSignalValue(ai.loadProgress);

  return {
    abort: ai.abort,
    handleExtractEntities: ai.handleExtractEntities,
    handleGenerate: ai.handleGenerate,
    isGenerating,
    loadProgress,
    modelStatus,
  };
}
