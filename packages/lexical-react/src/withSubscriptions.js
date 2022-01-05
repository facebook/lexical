/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

type Func = () => void;

export default function withSubscriptions(...func: Array<Func>): () => void {
  return () => {
    func.forEach((f) => f());
  };
}
