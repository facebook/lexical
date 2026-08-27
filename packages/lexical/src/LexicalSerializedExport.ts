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

const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Whether the export in progress is writing the compact form. A module-scope
 * flag rather than something threaded through every walk: `editorState.toJSON()`
 * takes no arguments, and the walk deliberately spans editors, so a nested one
 * (an image caption) writes the same form as the document that contains it.
 */
let compactExport = false;

/**
 * Run `f` writing the compact form of the document (or, with `false`, the
 * legacy form), for any export it performs: the `@lexical/clipboard` selection
 * export, a serialization walk of your own, and the nested editors those
 * serialize. A whole document states its form at the call site instead —
 * `editorState.toJSON(true)` — which is what lets its return type say which
 * shape it is; this is for the walks that have no such argument to take.
 *
 * The compact form omits every property parsing would restore anyway — one
 * whose value is its schema default, one the parser derives rather than reads,
 * and the deprecated `version` — so the two forms describe the same document.
 * It can only be read by a Lexical new enough to restore them, so keep writing
 * the legacy form until every reader is upgraded.
 *
 * `f` must be synchronous. The form is restored as soon as it returns, so an
 * `async` callback would give up the form at its first `await` and export in
 * whatever form is ambient when it resumes.
 *
 * @example
 * ```ts
 * const selectionJSON = $withCompactExport(true, () => $generateJSONFromSelection());
 * ```
 *
 * @experimental
 */
export function $withCompactExport<T>(compact: boolean, f: () => T): T {
  const previous = compactExport;
  let result: T;
  try {
    compactExport = compact;
    result = f();
  } finally {
    compactExport = previous;
  }
  if (__DEV__) {
    // An async callback type-checks (T is simply a Promise), and the export it
    // awaits would silently run in the ambient form instead of this one, so
    // say what happened rather than returning quietly wrong output.
    invariant(
      !isThenable(result),
      '$withCompactExport: f returned a thenable. The export form is restored synchronously, so an async callback gives it up at its first await; export inside a synchronous callback instead.',
    );
  }
  return result;
}

/**
 * Whether the export walk in progress is writing the compact form.
 *
 * For the one thing that cannot be told: a schema getter. The walk calls
 * `get<Prop>()` with no arguments — that contract is what lets `getTextContent`
 * and `getURL` be ordinary node methods rather than serialization-specific
 * ones — so a getter whose value depends on the form has to read it here:
 *
 * ```ts
 * getSerializedThumbnail(): string | undefined {
 *   // Derivable from `src`, so the compact form leaves it out.
 *   return $isCompactExport() ? undefined : this.getLatest().__thumbnail;
 * }
 * ```
 *
 * A getter that serializes a *nested editor* needs nothing: `toJSON()` with no
 * argument writes the ambient form, which is what keeps an image caption in
 * the same form as the document containing it.
 *
 * This reports the form of the surrounding **export walk** — what
 * {@link $withCompactExport} established, and so what
 * `editorState.toJSON(compact)` and the `@lexical/clipboard` selection export
 * establish. It is deliberately *not* set by an individual
 * {@link LexicalNode.exportJSON} call: that method takes its own `compact`
 * argument and is called by the walk with the walk's form already in effect,
 * so having it set this too would say a document is compact when only one node
 * was asked to be. A bare `node.exportJSON(true)` outside a walk therefore
 * reports `false` here.
 *
 * Anything with a call site of its own should take the form as an argument
 * rather than read it here.
 *
 * @experimental
 */
export function $isCompactExport(): boolean {
  return compactExport;
}

function isThenable(value: unknown): boolean {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof (value as {then?: unknown}).then === 'function'
  );
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
