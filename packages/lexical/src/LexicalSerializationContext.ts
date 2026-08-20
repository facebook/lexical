/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Klass} from './LexicalEditor';
import type {LexicalNode, SerializedLexicalNode} from './LexicalNode';

import {
  $withContext,
  type AnyContextConfigPairOrUpdater,
  type ContextConfig,
  createContextState,
  getContextRecord,
  getContextValue,
} from './LexicalContextRecord';
import {
  $validatedExportJSON,
  type AppliedSerialization,
  setSerializationInterceptor,
} from './LexicalSerializedExport';
import {getComposedSchema} from './LexicalUtils';

/**
 * Tags a {@link SerializationStateConfig} so it cannot be mixed up with the
 * DOM render or import contexts, which share the same record machinery.
 *
 * @experimental
 */
export const SerializationContextSymbol: unique symbol = Symbol.for(
  '@lexical/SerializationContext',
);

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
export type SerializationStateConfig<V> = ContextConfig<
  typeof SerializationContextSymbol,
  V
>;

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
  return createContextState(
    SerializationContextSymbol,
    name,
    () => defaultValue,
  );
}

/**
 * Middleware deciding what a node contributes to a JSON export, in the same
 * style as the DOM render overrides of `@lexical/html`: call `$next()` to get
 * the JSON the default implementation (or a lower-priority override) would
 * produce and enhance it, return your own JSON to replace it, or return `null`
 * to omit the node — and with it its subtree. The root node cannot be omitted;
 * an omission returned for it is ignored and the root exports normally.
 *
 * Enhancing means returning what `$next()` produced, whether spread
 * (`{...$next(), redacted: true}`), assigned onto (`Object.assign({}, $next())`)
 * or returned as-is; the walk still owns the node's children and slots and
 * fills them in. Anything else is a replacement and is authoritative, subtree
 * included: the walk appends neither children nor slots to it, and leaves it
 * uncompacted when its `type` is not the node's own, since the node's schema
 * says nothing about another type's properties.
 *
 * The distinction is carried on the object `$next()` returns, so it survives
 * spread and `Object.assign` but not a structural copy — `structuredClone`,
 * `JSON.parse(JSON.stringify(...))` and deep-clone helpers all produce a
 * *replacement*, and an element cloned that way exports with an empty
 * `children`. Enhance by spreading, and deep-copy only the parts you mean to
 * rewrite.
 *
 * Write it as a pure mapping from node to JSON. A walk may consult it for a
 * node it does not end up emitting — the `@lexical/clipboard` selection export
 * walks past unselected nodes to reach the selected ones inside them — so an
 * override that counts what it sees, or keeps other state, will not count what
 * the document contains.
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

/**
 * The scope JSON export contexts are installed under. A placeholder rather
 * than the editor, for two reasons: `editorState.toJSON()` runs with the
 * active editor set to `null`, and an export deliberately spans editors so a
 * nested one (an image caption) inherits the outer document's context — a
 * redaction override cannot be bypassed by nesting.
 */
const SerializationScope = Symbol.for('@lexical/SerializationScope');

/**
 * Read a serialization context value. Outside of an export (or for a config
 * the active context does not set) this is the config's default.
 *
 * @experimental
 */
export function $getSerializationContextValue<V>(
  cfg: SerializationStateConfig<V>,
): V {
  // The tag is a phantom type, so it cannot be inferred from `cfg` and is
  // pinned here.
  return getContextValue<typeof SerializationContextSymbol, V>(
    getContextRecord(SerializationContextSymbol, SerializationScope),
    cfg,
  );
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
  // A child record chains off the enclosing one, so unset values read through
  // to it; when no pair changes a value no layer is installed at all.
  return $withContext<
    typeof SerializationContextSymbol,
    typeof SerializationScope
  >(SerializationContextSymbol)(
    pairs as readonly AnyContextConfigPairOrUpdater<
      typeof SerializationContextSymbol
    >[],
    SerializationScope,
  );
}

/**
 * How one serialized property is compacted: dropped outright when the parser
 * ignores it (a derived property, declared `{setter: null}` — writing it costs
 * bytes nothing will ever read), otherwise dropped when its value is strictly
 * equal to the schema default parsing would restore.
 */
interface CompactField {
  readonly derived: boolean;
  readonly defaultValue: unknown;
}

// Keyed by node class like the adjacent STATIC_NODE_CONFIG_CACHE: a WeakMap so
// dynamically created classes (tests, HMR reloads) stay collectable.
const compactFieldsByClass = new WeakMap<
  Klass<LexicalNode>,
  ReadonlyMap<string, CompactField>
>();

/**
 * What the compact form may drop for a node class, derived from the same
 * composed `json` schema the setters and getters are compiled from.
 */
function getCompactFields(
  klass: Klass<LexicalNode>,
): ReadonlyMap<string, CompactField> {
  let compact = compactFieldsByClass.get(klass);
  if (compact === undefined) {
    const fields = new Map<string, CompactField>();
    for (const [key, schema] of getComposedSchema(klass).fieldsDerivedFirst) {
      fields.set(key, {
        defaultValue: schema.defaultValue,
        derived: schema.setter === null,
      });
    }
    compact = fields;
    compactFieldsByClass.set(klass, compact);
  }
  return compact;
}

/**
 * Produce the compact form of one node's JSON: drop the deprecated `version`
 * when it is `1` (a `version` other than `1` is a migration marker some nodes
 * branch on, so it is preserved), drop any property the parser derives rather
 * than reads, and drop any whose value is strictly equal to its schema default.
 *
 * `children` and `$slots` are structural rather than schema-declared, so they
 * are never dropped here; the walk owns them.
 *
 * What may be dropped comes from `node`'s own class, so `json` must be JSON
 * that describes `node` — its own export, or an enhancement of it. JSON an
 * override substituted for a *different* node type must not be passed here:
 * this table would read its properties as that other class's derived or
 * default-valued ones and drop them.
 *
 * @experimental
 */
export function $compactSerializedNode(
  node: LexicalNode,
  json: SerializedLexicalNode,
): SerializedLexicalNode {
  const fields = getCompactFields(node.constructor as Klass<LexicalNode>);
  const source = json as unknown as Record<string, unknown>;
  // One pass: copy through only what survives, rather than cloning everything
  // and then deleting (which also puts the result into dictionary mode).
  const compact: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (key === 'version' && value === 1) {
      continue;
    }
    const field = fields.get(key);
    if (
      field !== undefined &&
      (field.derived || value === field.defaultValue)
    ) {
      continue;
    }
    compact[key] = value;
  }
  return compact as unknown as SerializedLexicalNode;
}

/**
 * Marks the JSON `$next()` handed to an override, so the walk can tell an
 * *enhancement* of the node's own export from an authoritative *replacement*.
 * A symbol key is copied by object spread — which is how an override enhances,
 * `{...$next(), extra}` — but is absent from an object the override built
 * itself, so the distinction is a fact rather than a guess about the result's
 * shape. It is deleted again before anything escapes this function, so it never
 * reaches the exported document, `JSON.stringify` or a test matcher.
 */
const DEFAULT_EXPORT_MARKER: unique symbol = Symbol('$next');

type MarkedSerializedNode = SerializedLexicalNode & {
  [DEFAULT_EXPORT_MARKER]?: true;
};

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
  if (
    getContextRecord(SerializationContextSymbol, SerializationScope) ===
    undefined
  ) {
    // Installed for the process once any context is used, but most exports run
    // outside one: skip the override lookup, the memo closure and the identity
    // comparisons and just take the default path.
    return {recurseChildren: true, serializedNode: $validatedExportJSON(node)};
  }
  const override = $getSerializationContextValue(SerializationContextOverride);
  const compact = $getSerializationContextValue(SerializationContextCompact);
  if (override === null) {
    // Nothing can replace the JSON, so the walk owns the subtree by
    // construction: skip the memo closure and the marker entirely. This is the
    // common configuration — a context set only to ask for the compact form.
    const serializedNode = $validatedExportJSON(node);
    return {
      recurseChildren: true,
      serializedNode: compact
        ? $compactSerializedNode(node, serializedNode)
        : serializedNode,
    };
  }
  // Memoized so repeated $next() calls are stable and the sanity checks run at
  // most once.
  let defaultResult: MarkedSerializedNode | undefined;
  const $default = (): SerializedLexicalNode => {
    if (defaultResult === undefined) {
      defaultResult = $validatedExportJSON(node);
      defaultResult[DEFAULT_EXPORT_MARKER] = true;
    }
    return defaultResult;
  };
  let result: MarkedSerializedNode | null = override(node, $default);
  if (result === null) {
    if (!isRoot) {
      // The override may have called $next() and kept its result, so the
      // marker has to come off even on the path that discards it.
      if (defaultResult !== undefined) {
        delete defaultResult[DEFAULT_EXPORT_MARKER];
      }
      return null;
    }
    // A document must have a root, so an omission returned for it is ignored.
    result = $default();
  }
  // The result still carries the marker exactly when it is the node's own
  // export or a spread of it, which is what makes the walk — rather than the
  // override — the owner of this node's children and slots.
  const recurseChildren = result[DEFAULT_EXPORT_MARKER] === true;
  delete result[DEFAULT_EXPORT_MARKER];
  if (defaultResult !== undefined && defaultResult !== result) {
    // A replacement may still embed `$next()` (as a child, say), so the
    // discarded default has to be cleaned up too.
    delete defaultResult[DEFAULT_EXPORT_MARKER];
  }
  // Compaction reads `node`'s own schema, so it only applies to JSON that
  // still describes `node`. An override that substitutes JSON of another type
  // is written as-is; the legacy form is always valid, and dropping its
  // properties by this node's table would corrupt it.
  const serializedNode =
    compact && result.type === node.getType()
      ? $compactSerializedNode(node, result)
      : result;
  return {recurseChildren, serializedNode};
}
