/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * A minimal stand-in for a Lexical node — three string fields, similar
 * memory pressure to a real `TextNode` without pulling in the full
 * editor stack. Suitable for benchmarking data structures that hold
 * NodeMap-shaped values.
 */
export type FakeNode = {
  __key: string;
  __type: string;
  __parent: string | null;
};

export function makeNode(key: string): FakeNode {
  return {__key: key, __parent: 'root', __type: 'text'};
}

/**
 * Build a Map of `size` FakeNodes keyed by their decimal index.
 */
export function buildMap(size: number): Map<string, FakeNode> {
  const m = new Map<string, FakeNode>();
  for (let i = 0; i < size; i++) {
    const k = String(i);
    m.set(k, makeNode(k));
  }
  return m;
}
