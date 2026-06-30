/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * The typed event map for a given {@link EventTarget}. Falls back to the global
 * handlers map (rather than a permissive `Record<string, Event>`) so unknown
 * event names are rejected as typos. Shared by {@link registerEventListener}
 * and `registerEventListeners`; the former additionally has a `string` overload
 * as an escape hatch for non-standard names (e.g. the legacy `textInput`),
 * which the object form intentionally does not.
 */
export type EventMapOf<T extends EventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : T extends HTMLElement
      ? HTMLElementEventMap
      : GlobalEventHandlersEventMap;

/**
 * Add an event listener to `target` and return a function that removes it.
 *
 * This is a thin, strongly typed wrapper around
 * {@link EventTarget.addEventListener} that mirrors its overloads but returns a
 * dispose function instead of `void`. It removes the
 * `addEventListener`/`removeEventListener` boilerplate that every DOM
 * subscription would otherwise duplicate, and composes cleanly with
 * {@link mergeRegister} or as the return value of an effect.
 *
 * The same `options` value is forwarded to both `addEventListener` and
 * `removeEventListener` so that the `capture` flag always matches, which is
 * required for the listener to be removed correctly.
 *
 * @example
 * ```ts
 * // Returned directly from a React effect
 * useEffect(
 *   () => registerEventListener(container, 'keydown', handler),
 *   [container],
 * );
 * ```
 * @example
 * ```ts
 * // Composed with other teardown via mergeRegister
 * return mergeRegister(
 *   registerEventListener(window, 'resize', onResize),
 *   registerEventListener(document, 'selectionchange', onSelectionChange),
 * );
 * ```
 *
 * @param target - The {@link EventTarget} to subscribe to
 * @param type - The event type to listen for (e.g. `'keydown'`)
 * @param listener - The listener invoked when a matching event is dispatched
 * @param options - Options forwarded to `add`/`removeEventListener`
 * @returns A function that removes the listener when called
 */
export function registerEventListener<
  T extends EventTarget,
  K extends keyof EventMapOf<T> & string,
>(
  target: T,
  type: K,
  listener: (this: T, ev: EventMapOf<T>[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
// Fallback for non-standard event names (e.g. the legacy `textInput`) and
// targets without a typed event map.
export function registerEventListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function registerEventListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): () => void {
  target.addEventListener(type, listener, options);
  // Return a bound `removeEventListener` rather than an arrow so the dispose
  // function doesn't allocate an extra closure over the arguments.
  return target.removeEventListener.bind(target, type, listener, options);
}
