/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Klass} from './LexicalEditor';
import type {LexicalNode, SerializedLexicalNode} from './LexicalNode';
import type {AnySerializationSchema} from './LexicalSchema';

import invariant from '@lexical/internal/invariant';

import {$isElementNode} from '.';
import {iterStaticNodeConfigChain} from './LexicalUtils';

/**
 * A value that can be varied for the duration of a JSON export, created with
 * {@link createSerializationState} and read with
 * {@link $getSerializationContextValue}.
 *
 * Note that to support the pair syntax you can not use a function for `V`
 * directly (wrap it in an array or object), mirroring the render context of
 * `@lexical/html`.
 *
 * @experimental
 */
export interface SerializationStateConfig<V> {
  readonly name: string;
  readonly defaultValue: V;
}

/**
 * A {@link SerializationStateConfig} paired with the value to use for it.
 *
 * @experimental
 */
export type SerializationStateConfigPair<V> = readonly [
  SerializationStateConfig<V>,
  V,
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnySerializationStateConfigPair = SerializationStateConfigPair<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Create a context value for use during a JSON export.
 *
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function createSerializationState<V>(
  name: string,
  defaultValue: V,
): SerializationStateConfig<V> {
  return {defaultValue, name};
}

/**
 * Middleware deciding what a node contributes to a JSON export, in the same
 * style as the DOM render overrides of `@lexical/html`: call `$next()` to get
 * the JSON the default implementation (or a lower-priority override) would
 * produce and enhance it, return your own JSON to replace it (a replacement is
 * authoritative, including its `children` — the walk does not append the live
 * children to a replaced element), or return `null` to omit the node — and
 * with it its subtree. The root node cannot be omitted; an omission returned
 * for it is ignored and the root exports normally.
 *
 * Only one is installed at a time. Rather than hand-writing it, declare
 * per-node overrides with `jsonOverride` and let `JSONExtension` compile them
 * into this; it owns matching nodes and chaining `$next`.
 *
 * @experimental
 */
export type SerializationOverrideFn = (
  node: LexicalNode,
  $next: () => SerializedLexicalNode,
) => SerializedLexicalNode | null;

/**
 * When true, export the compact form of the document: a node-specific property
 * whose value is strictly equal (`===`) to its `json` schema default is
 * omitted, as is the deprecated `version` when it is `1`. Parsing restores
 * each omitted property from the same schema default, so the compact and
 * legacy forms describe the same document. (Strict equality means a
 * reference-typed default — an array or object — is never treated as equal,
 * so such properties are always written.)
 *
 * Defaults to false, which produces the legacy form: every property is written
 * out, as it always has been.
 *
 * @experimental
 */
export const SerializationContextCompact =
  /* @__PURE__ */ createSerializationState<boolean>('compact', false);

/**
 * The {@link SerializationOverrideFn} to consult for each node, normally
 * compiled from `jsonOverride` declarations by `JSONExtension`.
 *
 * @experimental
 */
export const SerializationContextOverride =
  /* @__PURE__ */ createSerializationState<null | SerializationOverrideFn>(
    'override',
    null,
  );

type SerializationContextRecord = ReadonlyMap<
  SerializationStateConfig<unknown>,
  unknown
>;

// Serialization is a synchronous depth-first walk, so the active context is
// module scope with strict stack discipline rather than something attached to
// the editor: there is exactly one export in flight at a time. Note that this
// also means a nested editor serialized during exportJSON (e.g. an image
// caption) runs under the outer document's context — deliberate, so that e.g.
// a redaction override cannot be bypassed by nesting.
let activeContext: null | SerializationContextRecord = null;

/**
 * Read a serialization context value. Outside of an export (or for a config
 * the active context does not set) this is the config's default.
 *
 * @experimental
 */
export function $getSerializationContextValue<V>(
  cfg: SerializationStateConfig<V>,
): V {
  return activeContext &&
    activeContext.has(cfg as SerializationStateConfig<unknown>)
    ? (activeContext.get(cfg as SerializationStateConfig<unknown>) as V)
    : cfg.defaultValue;
}

/**
 * Run `f` with the given serialization context values, which apply to any
 * export it performs (`editorState.toJSON()`, `node.exportJSON()` through the
 * export walk, and so on — including the nested editors those exports
 * serialize, such as image captions). Values not given are inherited from the
 * enclosing context.
 *
 * @example
 * ```ts
 * const compactJSON = $withSerializationContext([
 *   [SerializationContextCompact, true],
 * ])(() => editorState.toJSON());
 * ```
 *
 * @experimental
 */
export function $withSerializationContext(
  pairs: readonly AnySerializationStateConfigPair[],
): <T>(f: () => T) => T {
  return f => {
    const previous = activeContext;
    const next = new Map(previous);
    for (const [cfg, value] of pairs) {
      next.set(cfg, value);
    }
    activeContext = next;
    try {
      return f();
    } finally {
      activeContext = previous;
    }
  };
}

// Keyed by node class like the adjacent STATIC_NODE_CONFIG_CACHE: a WeakMap so
// dynamically created classes (tests, HMR reloads) stay collectable. The
// cached entries array avoids a per-node Object.entries on the compact path.
const composedFieldEntriesByClass = new WeakMap<
  Klass<LexicalNode>,
  readonly (readonly [string, AnySerializationSchema])[]
>();

/**
 * The `json` schema fields a node has, including those it inherits from its
 * ancestors (an ElementNode subclass gets `direction`/`format`/… from the
 * schema ElementNode publishes). Compiled once per class.
 *
 * @internal
 */
function getComposedSchemaFieldEntries(
  klass: Klass<LexicalNode>,
): readonly (readonly [string, AnySerializationSchema])[] {
  let entries = composedFieldEntriesByClass.get(klass);
  if (entries === undefined) {
    const fields: Record<string, AnySerializationSchema> = {};
    for (const {ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
      const json = ownNodeConfig && ownNodeConfig.json;
      if (json && json.meta.kind === 'object') {
        // Ancestors are visited last but must not override a subclass field,
        // so only fill in what is still missing.
        for (const [key, schema] of Object.entries(json.meta.fields)) {
          if (!(key in fields)) {
            fields[key] = schema;
          }
        }
      }
    }
    entries = Object.entries(fields);
    composedFieldEntriesByClass.set(klass, entries);
  }
  return entries;
}

/**
 * Produce the compact form of one node's JSON: drop the deprecated `version`
 * when it is `1` (a `version` other than `1` is a migration marker some nodes
 * branch on, so it is preserved), and drop any node-specific property whose
 * value is strictly equal to its schema default.
 *
 * `children` and `$slots` are structural rather than schema-declared, so they
 * are never dropped here; the walk owns them.
 *
 * @experimental
 */
export function $compactSerializedNode(
  node: LexicalNode,
  json: SerializedLexicalNode,
): SerializedLexicalNode {
  const entries = getComposedSchemaFieldEntries(
    node.constructor as Klass<LexicalNode>,
  );
  const compact: Record<string, unknown> = {};
  const source = json as unknown as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    if (key === 'version' && source[key] === 1) {
      continue;
    }
    compact[key] = source[key];
  }
  for (let i = 0; i < entries.length; i++) {
    const [key, schema] = entries[i];
    if (key in compact && compact[key] === schema.defaultValue) {
      delete compact[key];
    }
  }
  return compact as unknown as SerializedLexicalNode;
}

/**
 * The node's own `exportJSON()` with the sanity checks every export walk
 * relied on: the serialized `type` must match the class, and an element must
 * carry a `children` array for the walk to fill. Override output is
 * deliberately not validated — a replacement may be JSON of any shape.
 */
function $validatedExportJSON(node: LexicalNode): SerializedLexicalNode {
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

/**
 * Apply the active serialization context to one node: consult the installed
 * override (which may replace or omit the node), then compact what survives
 * when the context asks for it. Returns `null` when the node was omitted;
 * the root is never omitted (an override's omission is ignored for it).
 *
 * @internal
 */
export function $applySerializationContext(
  node: LexicalNode,
  isRoot: boolean,
): AppliedSerialization | null {
  const override = $getSerializationContextValue(SerializationContextOverride);
  // Memoized so repeated $next() calls are stable, the sanity checks run at
  // most once, and we can tell afterwards whether the result came from the
  // node's own exportJSON.
  let defaultResult: SerializedLexicalNode | undefined;
  const $default = () =>
    defaultResult === undefined
      ? (defaultResult = $validatedExportJSON(node))
      : defaultResult;
  let result = override ? override(node, $default) : $default();
  if (result === null) {
    if (!isRoot) {
      return null;
    }
    // A document must have a root, so an omission returned for it is ignored.
    result = $default();
  }
  const serializedNode = $getSerializationContextValue(
    SerializationContextCompact,
  )
    ? $compactSerializedNode(node, result)
    : result;
  // Compaction copies properties, so `children` keeps its identity: recursion
  // is safe exactly when the children array is the one exportJSON created.
  const recurseChildren =
    defaultResult !== undefined &&
    (result === defaultResult ||
      (result as {children?: unknown}).children ===
        (defaultResult as {children?: unknown}).children);
  return {recurseChildren, serializedNode};
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
