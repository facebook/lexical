/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, SerializedLexicalNode} from './LexicalNode';

import invariant from '@lexical/internal/invariant';

import {$isElementNode} from '.';

/**
 * Whether the export in progress is writing the compact form. A module-scope
 * flag rather than something threaded through every walk: `editorState.toJSON()`
 * takes no arguments, and the walk deliberately spans editors, so a nested one
 * (an image caption) writes the same form as the document that contains it.
 */
let compactExport = false;

/**
 * Whether {@link $withCompactExport} is currently asking for the compact form.
 * A node that writes its own `exportJSON` receives this as its argument and
 * does not need to read it.
 *
 * @experimental
 */
export function $isCompactExport(): boolean {
  return compactExport;
}

/**
 * Run `f` writing the compact form of the document (or, with `false`, the
 * legacy form), for any export it performs: `editorState.toJSON()`, the
 * `@lexical/clipboard` selection export, and the nested editors those
 * serialize.
 *
 * The compact form omits every property parsing would restore anyway — one
 * whose value is its schema default, one the parser derives rather than reads,
 * and the deprecated `version` — so the two forms describe the same document.
 * It can only be read by a Lexical new enough to restore them, so keep writing
 * the legacy form until every reader is upgraded.
 *
 * @example
 * ```ts
 * const compactJSON = $withCompactExport(true, () => editorState.toJSON());
 * ```
 *
 * @experimental
 */
export function $withCompactExport<T>(compact: boolean, f: () => T): T {
  const previous = compactExport;
  try {
    compactExport = compact;
    return f();
  } finally {
    compactExport = previous;
  }
}

/**
 * Export one node's JSON in the form the active export asks for, with the
 * sanity checks every export walk relies on: the serialized `type` must match
 * the class, and an element must carry a `children` array for the walk to fill.
 *
 * Use this instead of calling `node.exportJSON()` directly when writing a
 * serialization walk of your own — it is what `editorState.toJSON()` and the
 * `@lexical/clipboard` selection export both call, so {@link $withCompactExport}
 * governs every one of them alike.
 *
 * @experimental
 */
export function $exportNodeJSON(node: LexicalNode): SerializedLexicalNode {
  const serializedNode = node.exportJSON(compactExport);
  const nodeClass = node.constructor;
  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.',
      nodeClass.name,
    );
  }
  if (
    $isElementNode(node) &&
    !Array.isArray(
      (serializedNode as SerializedLexicalNode & {children?: unknown}).children,
    )
  ) {
    invariant(
      false,
      'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
      nodeClass.name,
    );
  }
  return serializedNode;
}
