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
 * The node's own `exportJSON()` with the sanity checks every export walk
 * relied on: the serialized `type` must match the class, and an element must
 * carry a `children` array for the walk to fill. Override output is
 * deliberately not validated — a replacement may be JSON of any shape.
 *
 * @internal
 */
export function $validatedExportJSON(node: LexicalNode): SerializedLexicalNode {
  const serializedNode = node.exportJSON();
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

/**
 * What the active serialization context decided for one node.
 *
 * @experimental
 */
export interface AppliedSerialization {
  /** The JSON this node contributes (possibly replaced and/or compacted). */
  readonly serializedNode: SerializedLexicalNode;
  /**
   * Whether the walk owns this node's subtree — whether it should serialize
   * the node's live children and slots into `serializedNode`. True when
   * `serializedNode` is the node's own `exportJSON()` or an enhancement of it
   * (an override that spread `$next()`); false when an override supplied JSON
   * of its own, which is authoritative including whatever subtree it carries.
   */
  readonly recurseChildren: boolean;
}

type SerializationInterceptor = (
  node: LexicalNode,
  isRoot: boolean,
) => AppliedSerialization | null;

// The serialization-context machinery (overrides, compaction) attaches here
// lazily: $withSerializationContext installs the interceptor the first time it
// is called. Until then every export walk takes the plain validated-export
// path below, so applications that never configure a serialization context do
// not carry the context code — the walk holds no reference to it, and
// bundlers drop it.
let serializationInterceptor: null | SerializationInterceptor = null;

/** @internal */
export function setSerializationInterceptor(
  interceptor: SerializationInterceptor,
): void {
  serializationInterceptor = interceptor;
}

/**
 * Export one node's JSON with the active serialization context applied: any
 * installed override runs (and may replace the node, or return `null` to omit
 * it and its subtree), and what survives is compacted when the context asks
 * for it. Returns `null` when the node was omitted; pass `isRoot` for a
 * document's root, which cannot be omitted (an override's omission is ignored
 * for it).
 *
 * Use this instead of calling `node.exportJSON()` directly when writing a
 * serialization walk of your own — it is what `editorState.toJSON()` and the
 * `@lexical/clipboard` selection export both call, so a context set with
 * {@link $withSerializationContext} governs every one of them alike. Fill the
 * returned `serializedNode`'s `children` (and slots) from the node's live
 * subtree only when `recurseChildren` says so; otherwise an override supplied
 * that JSON and it is authoritative, subtree included.
 *
 * Until `$withSerializationContext` has run, this is exactly the node's own
 * validated `exportJSON()`.
 *
 * @experimental
 */
export function $applySerializationContext(
  node: LexicalNode,
  isRoot: boolean,
): AppliedSerialization | null {
  return serializationInterceptor
    ? serializationInterceptor(node, isRoot)
    : {recurseChildren: true, serializedNode: $validatedExportJSON(node)};
}
