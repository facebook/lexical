/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {PublicPath} from 'wxt/browser';

export default function injectScript(src: PublicPath) {
  const s = document.createElement('script');
  s.src = browser.runtime.getURL(src);
  s.type = 'module'; // ESM module support
  s.onload = () => s.remove();
  (document.head || document.documentElement).append(s);
}
