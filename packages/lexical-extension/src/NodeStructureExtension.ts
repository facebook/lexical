/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $normalizeNodeStructure,
  defineExtension,
  ElementNode,
  getDeclaredNodeStructure,
  type LexicalEditor,
  safeCast,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

/**
 * @experimental node-structure
 *
 * Configuration of {@link NodeStructureExtension} (each key is also a
 * signal in its output).
 */
export interface NodeStructureConfig {
  /**
   * `true` removes the normalization transforms (the declarations are then
   * only read, never enforced). Default `false`.
   */
  disabled: boolean;
}

/**
 * @experimental node-structure
 *
 * Registers the normalization {@link NodeStructureExtension} runs, as a
 * transform on every registered element class that declares `children` or
 * `mergeAdjacent`. Idempotent (one shared transform per class). For code
 * that builds an editor without extensions, such as a collaboration binding.
 *
 * @returns A function that removes the transforms it added
 */
export function registerNodeStructure(editor: LexicalEditor): () => void {
  const dispose: VoidFunction[] = [];
  for (const {klass, transforms} of editor._nodes.values()) {
    if (
      !(klass.prototype instanceof ElementNode) ||
      transforms.has($normalizeNodeStructure)
    ) {
      continue;
    }
    const declared = getDeclaredNodeStructure(klass);
    if (
      declared.children !== undefined ||
      declared.mergeAdjacent !== undefined
    ) {
      transforms.add($normalizeNodeStructure);
      dispose.push(() => transforms.delete($normalizeNodeStructure));
    }
  }
  return () => dispose.forEach(fn => fn());
}

/**
 * @experimental node-structure
 *
 * Enforces the structure node classes declare in `$config()`: `children`
 * (a block lifted out of a node that holds inline content, inline content
 * wrapped in a paragraph in a node that holds blocks, a disallowed child
 * wrapped in the first listed class) and `mergeAdjacent` (equal adjacent
 * siblings merged). It runs as a transform on every dirty element of a
 * class that declares either, in the same update, and only moves content.
 *
 * Opt-in: without it, the declarations change nothing at runtime.
 * Collaboration bindings that derive storage from the declarations
 * (`@lexical/y`) depend on it, so that every peer holds the same
 * normalized tree.
 */
export const NodeStructureExtension = defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: safeCast<NodeStructureConfig>({
    disabled: false,
  }),
  name: '@lexical/NodeStructure',
  register: (editor, config, state) => {
    const stores = state.getOutput();
    return effect(() => {
      if (!stores.disabled.value) {
        return registerNodeStructure(editor);
      }
    });
  },
});
