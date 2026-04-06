/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*@__INLINE__*/
export default function warnOnlyOnce(message: string): () => void {
  if (__DEV__) {
    let run = false;
    return () => {
      if (!run) {
        console.warn(message);
      }
      run = true;
    };
  } else {
    return () => {};
  }
}
