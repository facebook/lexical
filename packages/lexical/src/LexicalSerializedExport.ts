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
 * @internal
 */
export interface AppliedSerialization {
  /** The JSON this node contributes (possibly replaced and/or compacted). */
  readonly serializedNode: SerializedLexicalNode;
  /**
   * Whether the walk should serialize the node's live children (and slots)
   * into `serializedNode`. True only when `serializedNode`'s `children` array
   * came from the node's own `exportJSON()`; a replacement supplied by an
   * override is authoritative, including whatever subtree it carries.
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
 * Apply the active serialization context to one node: consult the installed
 * override (which may replace or omit the node), then compact what survives
 * when the context asks for it. Returns `null` when the node was omitted;
 * the root is never omitted (an override's omission is ignored for it).
 * Until `$withSerializationContext` has run, this is exactly the node's own
 * validated `exportJSON()`.
 *
 * @internal
 */
export function $applySerializationContext(
  node: LexicalNode,
  isRoot: boolean,
): AppliedSerialization | null {
  return serializationInterceptor
    ? serializationInterceptor(node, isRoot)
    : {recurseChildren: true, serializedNode: $validatedExportJSON(node)};
}

/**
 * Export one node's JSON with the active serialization context applied: any
 * installed override runs (and may replace the node or return `null` to omit
 * it), and what survives is compacted when the context asks for it.
 *
 * Use this instead of calling `node.exportJSON()` directly when writing a
 * serialization walk of your own — it is what `editorState.toJSON()` and the
 * `@lexical/clipboard` selection export both call, so a context set with
 * {@link $withSerializationContext} governs every one of them alike. Note
 * that when the returned JSON was replaced by an override it is authoritative,
 * including any `children` it carries; only JSON produced by the node's own
 * `exportJSON()` expects the walk to fill its `children`.
 *
 * @experimental
 */
export function $exportNodeJSON(
  node: LexicalNode,
): SerializedLexicalNode | null {
  const applied = $applySerializationContext(node, false);
  return applied === null ? null : applied.serializedNode;
}
