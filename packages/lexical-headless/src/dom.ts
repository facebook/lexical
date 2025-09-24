/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {Window as HappyDOMWindow} from 'happy-dom';

/**
 * Call the given synchronous function with a window object,
 * either from the browser or happy-dom in a non-browser
 * environment. It will also set window, document, and MutationObserver
 * on globalThis while the callback is running. This is
 * useful primarily to parse and render HTML server-side.
 *
 * It is not safe to do anything asynchronous during this callback.
 *
 * @param f A function that uses the window object
 * @returns The result of that function.
 */
export function withDOM<T>(f: (window: Window) => T): T {
  const prevWindow = globalThis.window;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- handle recursive case
  if (prevWindow) {
    return f(globalThis.window);
  }
  const prevMutationObserver = globalThis.MutationObserver;
  const prevDocument = globalThis.document;
  // @ts-expect-error -- DOMWindow is not exactly Window
  const newWindow: Window & typeof globalThis = new HappyDOMWindow();
  globalThis.window = newWindow;
  globalThis.document = newWindow.document;
  globalThis.MutationObserver = newWindow.MutationObserver;
  try {
    return f(newWindow);
  } finally {
    globalThis.MutationObserver = prevMutationObserver;
    globalThis.document = prevDocument;
    globalThis.window = prevWindow;
    newWindow.close();
  }
}
