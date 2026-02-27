/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import invariant from 'shared/invariant';

export function withDOM<T>(f: (window: Window) => T): T {
  invariant(
    !!globalThis.window,
    '@lexical/headless/dom compiled for browser used in an environment without a global window',
  );
  return f(globalThis.window);
}
