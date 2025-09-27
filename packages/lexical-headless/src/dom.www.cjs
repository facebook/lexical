/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

if (typeof window === 'undefined') {
  exports.withDOM = function withDOM(f) {
    const ctx = global;
    const prevWindow = ctx.window;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- handle recursive case
    if (prevWindow) {
      return f(ctx.window);
    }
    const prevGetComputedStyle = ctx.getComputedStyle;
    const prevDOMParser = ctx.DOMParser;
    const prevMutationObserver = ctx.MutationObserver;
    const prevDocument = ctx.document;
    const newWindow = new (require(':server-only-hack:jsdom').JSDOM)();
    ctx.window = newWindow;
    ctx.document = newWindow.document;
    ctx.MutationObserver = newWindow.MutationObserver;
    ctx.DOMParser = newWindow.DOMParser;
    ctx.getComputedStyle = newWindow.getComputedStyle;
    try {
      return f(newWindow);
    } finally {
      ctx.getComputedStyle = prevGetComputedStyle;
      ctx.DOMParser = prevDOMParser;
      ctx.MutationObserver = prevMutationObserver;
      ctx.document = prevDocument;
      ctx.window = prevWindow;
      newWindow.close();
    }
  };
} else {
  exports.withDOM = function withDOM(f) {
    return f(window);
  };
}
