/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ReadonlySignal} from '@lexical/extension';
import type {AnyLexicalExtension, LexicalExtensionOutput} from 'lexical';

import {useExtensionDependency} from '@lexical/react/useExtensionComponent';
import {useMemo, useSyncExternalStore} from 'react';

import {AIExtension, type ExtractedEntity} from './AIExtension';

type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UseAIReturn {
  abort: () => void;
  extractEntities: (
    text: string,
    entityTypes?: string[],
  ) => Promise<ExtractedEntity[]>;
  generateParagraph: (
    context: string,
    onToken: (token: string) => void,
  ) => Promise<string | null>;
  isGenerating: boolean;
  loadProgress: number | null;
  modelStatus: ModelStatus;
}

type SignalValue<S> = S extends ReadonlySignal<infer V> ? V : never;

export function useExtensionSignalValue<
  Extension extends AnyLexicalExtension,
  K extends keyof LexicalExtensionOutput<Extension>,
>(
  extension: Extension,
  prop: K,
): SignalValue<LexicalExtensionOutput<Extension>[K]> {
  const signal = useExtensionDependency(extension).output[
    prop
  ] as ReadonlySignal<SignalValue<LexicalExtensionOutput<Extension>[K]>>;
  const [subscribe, getSnapshot] = useMemo(
    () => [signal.subscribe.bind(signal), signal.peek.bind(signal)] as const,
    [signal],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAI(): UseAIReturn {
  const ai = useExtensionDependency(AIExtension).output;
  const isGenerating = useExtensionSignalValue(AIExtension, 'isGenerating');
  const modelStatus = useExtensionSignalValue(AIExtension, 'modelStatus');
  const loadProgress = useExtensionSignalValue(AIExtension, 'loadProgress');

  return {
    abort: ai.abort,
    extractEntities: ai.extractEntities,
    generateParagraph: ai.generateParagraph,
    isGenerating,
    loadProgress,
    modelStatus,
  };
}
