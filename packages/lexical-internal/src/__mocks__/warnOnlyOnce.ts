/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default function warnOnlyOnce(message: string): () => void {
  // The mock for this warns every time
  return () => console.warn(message);
}
