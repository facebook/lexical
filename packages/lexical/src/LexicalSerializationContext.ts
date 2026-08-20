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

import {
  $validatedExportJSON,
  type AppliedSerialization,
  setSerializationInterceptor,
} from './LexicalSerializedExport';
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
  // The export walks dispatch through a lazily-installed interceptor rather
  // than referencing this module, so applications that never configure a
  // serialization context do not carry it. Installing here — before any
  // context can become active — keeps that dispatch exhaustive.
  setSerializationInterceptor($applyActiveSerializationContext);
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
    // A Map rather than an object literal: `'toString' in {}` is true, so an
    // object would silently exclude fields named after Object.prototype
    // members (and `__proto__` would re-parent it rather than record a field).
    const fields = new Map<string, AnySerializationSchema>();
    for (const {ownNodeConfig} of iterStaticNodeConfigChain(klass)) {
      const json = ownNodeConfig && ownNodeConfig.json;
      if (json && json.meta.kind === 'object') {
        // Ancestors are visited last but must not override a subclass field,
        // so only fill in what is still missing.
        for (const [key, schema] of Object.entries(json.meta.fields)) {
          if (!fields.has(key)) {
            fields.set(key, schema);
          }
        }
      }
    }
    entries = [...fields];
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
  const source: Record<string, unknown> = json;
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
  return compact as SerializedLexicalNode;
}

/**
 * The interceptor `$applySerializationContext` dispatches to once
 * `$withSerializationContext` has installed it: consult the installed
 * override (which may replace or omit the node), then compact what survives
 * when the context asks for it. With no context active it reduces to the
 * plain validated default export, so installation alone changes nothing.
 */
function $applyActiveSerializationContext(
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
  // is safe exactly when the result is the node's own export, or carries the
  // very children array that export created. Comparing `children` is only
  // meaningful when there is one — for a node with no children (a decorator,
  // which may still host slots) two replacements both read `undefined`, so
  // that comparison would wrongly treat a replacement as the node's own.
  const defaultChildren =
    defaultResult === undefined
      ? undefined
      : (defaultResult as {children?: unknown}).children;
  const recurseChildren =
    defaultResult !== undefined &&
    (result === defaultResult ||
      (Array.isArray(defaultChildren) &&
        (result as {children?: unknown}).children === defaultChildren));
  return {recurseChildren, serializedNode};
}
