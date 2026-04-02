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

export function useSignalValue<V>(s: ReadonlySignal<V>): V {
  const [subscribe, getSnapshot] = useMemo(
    () => [s.subscribe.bind(s), s.peek.bind(s)] as const,
    [s],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
  return useSignalValue(signal);
}

// TODO: submit fix upstream for useExtensionComponent to handle
// extensions with register (Output invariance due to ExtensionRegisterState)
export function useExtensionComponent<
  Extension extends AnyLexicalExtension,
  Output extends LexicalExtensionOutput<Extension> & {
    Component: React.ComponentType;
  },
>(extension: Extension): Output['Component'] {
  return (useExtensionDependency(extension).output as Output).Component;
}
