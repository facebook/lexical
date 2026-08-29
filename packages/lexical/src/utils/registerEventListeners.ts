/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {mergeRegister} from './mergeRegister';
import {type EventMapOf, registerEventListener} from './registerEventListener';

/**
 * A map of event type to listener for a given {@link EventTarget}. Each
 * listener's event argument is inferred from the event type, e.g. for an
 * `HTMLElement` the `'keydown'` listener receives a `KeyboardEvent`.
 */
export type EventListenerMap<T extends EventTarget> = {
  [K in keyof EventMapOf<T>]?: (this: T, ev: EventMapOf<T>[K]) => unknown;
};

/**
 * Add several event listeners to a single `target` and return one function
 * that removes all of them.
 *
 * This is the batch form of {@link registerEventListener}: it takes a
 * `{type: listener}` object (strongly typed per event type) and shares one
 * `options` value across every listener. The returned dispose function removes
 * the listeners in reverse registration order (via {@link mergeRegister}).
 *
 * Because `options` is shared, register listeners that need a different
 * `options` value (e.g. a different `capture` flag) with a separate call and
 * combine the results with `mergeRegister`.
 *
 * @example
 * ```ts
 * // All five listeners share {capture: true}
 * return registerEventListeners(
 *   window,
 *   {
 *     beforeinput: report,
 *     cut: report,
 *     keydown: report,
 *     paste: report,
 *     selectionchange: report,
 *   },
 *   {capture: true},
 * );
 * ```
 *
 * @param target - The {@link EventTarget} to subscribe to
 * @param listeners - A map of event type to listener
 * @param options - Options forwarded to `add`/`removeEventListener` for every
 *   listener
 * @returns A function that removes every listener when called
 */
export function registerEventListeners<T extends EventTarget>(
  target: T,
  listeners: EventListenerMap<T>,
  options?: boolean | AddEventListenerOptions,
): () => void {
  // Erase the per-event-type listener signatures to the loose
  // `addEventListener` form at the single boundary where the typed map is
  // turned into untyped registrations.
  const entries = Object.entries(listeners) as [string, EventListener][];
  return mergeRegister(
    ...entries.map(([type, listener]) =>
      registerEventListener(target, type, listener, options),
    ),
  );
}
