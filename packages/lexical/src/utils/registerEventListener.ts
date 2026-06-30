/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
export function registerEventListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  listener: (this: Window, ev: WindowEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function registerEventListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
export function registerEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void;
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
