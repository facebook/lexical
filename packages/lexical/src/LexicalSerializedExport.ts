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
 * carry a `children` array for the walk to fill.
 *
 * @internal
 */
export function $validatedExportJSON(
  node: LexicalNode,
  compact: boolean,
): SerializedLexicalNode {
  const serializedNode = node.exportJSON(compact);
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

type SerializationInterceptor = (node: LexicalNode) => SerializedLexicalNode;

// The serialization-context machinery (currently just the compact form)
// attaches here lazily: $withSerializationContext installs the interceptor the
// first time it is called. Until then every export walk takes the plain
// validated-export path below, so applications that never configure a
// serialization context do not carry it — the walk holds no reference to it,
// and bundlers drop it.
let serializationInterceptor: null | SerializationInterceptor = null;

/** @internal */
export function setSerializationInterceptor(
  interceptor: SerializationInterceptor,
): void {
  serializationInterceptor = interceptor;
}

/**
 * Export one node's JSON in whatever form the active serialization context
 * asks for. Use this instead of calling `node.exportJSON()` directly when
 * writing a serialization walk of your own — it is what `editorState.toJSON()`
 * and the `@lexical/clipboard` selection export both call, so a context set
 * with {@link $withSerializationContext} governs every one of them alike.
 *
 * Until `$withSerializationContext` has run, this is exactly the node's own
 * validated `exportJSON()`.
 *
 * @experimental
 */
export function $applySerializationContext(
  node: LexicalNode,
): SerializedLexicalNode {
  return serializationInterceptor
    ? serializationInterceptor(node)
    : $validatedExportJSON(node, false);
}
