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

/**
 * A React hook that subscribes to a signal and returns its current value.
 * The component will re-render whenever the signal's value changes.
 *
 * @param s - The ReadonlySignal to subscribe to
 * @returns The current value of the signal
 *
 * @example
 * ```tsx
 * const signal = new Signal(0);
 * function MyComponent() {
 *   const value = useSignalValue(signal);
 *   return <div>Value: {value}</div>;
 * }
 * ```
 */
export function useSignalValue<V>(s: ReadonlySignal<V>): V {
  const [subscribe, getSnapshot] = useMemo(
    () => [s.subscribe.bind(s), s.peek.bind(s)] as const,
    [s],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Type helper that extracts the value type from a ReadonlySignal.
 * If the type is not a ReadonlySignal, it returns never.
 *
 * @example
 * ```tsx
 * type MySignal = ReadonlySignal<number>;
 * type Value = SignalValue<MySignal>; // number
 * ```
 */
export type SignalValue<S> = S extends ReadonlySignal<infer V> ? V : never;

/**
 * A React hook that subscribes to a signal property from a Lexical extension's output
 * and returns its current value. The component will re-render whenever the signal's value changes.
 *
 * This hook combines the functionality of useExtensionDependency and useSignalValue,
 * providing a convenient way to access reactive values from Lexical extensions.
 *
 * @param extension - The Lexical extension instance
 * @param prop - The property name in the extension's output that contains a signal
 * @returns The current value of the signal property
 *
 * @example
 * ```tsx
 * import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
 * import {MyExtension} from './MyExtension';
 *
 * function MyComponent() {
 *   // Assuming MyExtension has a signal property 'count' in its output
 *   const count = useExtensionSignalValue(MyExtension, 'count');
 *   return <div>Count: {count}</div>;
 * }
 * ```
 */
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
