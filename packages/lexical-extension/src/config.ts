/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {InitialEditorConfig, KlassConstructor, LexicalNode} from 'lexical';

export interface KnownTypesAndNodes {
  types: Set<string>;
  nodes: Set<KlassConstructor<typeof LexicalNode>>;
}
export function getKnownTypesAndNodes(config: InitialEditorConfig) {
  const types: KnownTypesAndNodes['types'] = new Set();
  const nodes: KnownTypesAndNodes['nodes'] = new Set();
  for (const klassOrReplacement of config.nodes ?? []) {
    const klass =
      typeof klassOrReplacement === 'function'
        ? klassOrReplacement
        : klassOrReplacement.replace;
    types.add(klass.getType());
    nodes.add(klass);
  }
  return {nodes, types};
}
