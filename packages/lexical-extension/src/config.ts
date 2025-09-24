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
/**
 * @experimental
 * Get the sets of nodes and types registered in the
 * {@link InitialEditorConfig}. This is to be used when an extension
 * needs to register optional behavior if some node or type is present.
 *
 * @param config The InitialEditorConfig (accessible from an extension's init)
 * @returns The known types and nodes as Sets
 */
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
