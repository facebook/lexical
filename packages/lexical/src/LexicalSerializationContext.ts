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

import {iterStaticNodeConfigChain} from './LexicalUtils';

/**
 * EXPERIMENTAL
 *
 * A value that can be varied for the duration of a JSON export, created with
 * {@link createSerializationState} and read with
 * {@link $getSerializationContextValue}.
 *
 * Note that to support the pair syntax you can not use a function for `V`
 * directly (wrap it in an array or object), mirroring the render context of
 * `@lexical/html`.
 */
export interface SerializationStateConfig<V> {
  readonly name: string;
  readonly defaultValue: V;
}

/**
 * EXPERIMENTAL
 *
 * A {@link SerializationStateConfig} paired with the value to use for it.
 */
export type SerializationStateConfigPair<V> = readonly [
  SerializationStateConfig<V>,
  V,
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnySerializationStateConfigPair = SerializationStateConfigPair<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * EXPERIMENTAL
 *
 * Create a context value for use during a JSON export.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function createSerializationState<V>(
  name: string,
  defaultValue: V,
): SerializationStateConfig<V> {
  return {defaultValue, name};
}

/**
 * EXPERIMENTAL
 *
 * Middleware deciding what a node contributes to a JSON export, in the same
 * style as the DOM render overrides of `@lexical/html`: call `$next()` to get
 * the JSON the default implementation (or a lower-priority override) would
 * produce and enhance it, return something else entirely to replace it, or
 * return `null` to omit the node — and with it its subtree.
 *
 * Only one is installed at a time. Rather than hand-writing it, declare
 * per-node overrides with `jsonOverride` and let `SerializationExtension`
 * compile them into this; it owns matching nodes and chaining `$next`.
 */
export type SerializationOverrideFn = (
  node: LexicalNode,
  $next: () => SerializedLexicalNode,
) => SerializedLexicalNode | null;

/**
 * EXPERIMENTAL
 *
 * When true, export the compact form of the document: a node-specific property
 * whose value equals its `json` schema default is omitted, as is the
 * deprecated `version`. Parsing restores each omitted property from the same
 * schema default, so the compact and legacy forms describe the same document.
 *
 * Defaults to false, which produces the legacy form: every property is written
 * out, as it always has been.
 */
export const SerializationContextCompact =
  /* @__PURE__ */ createSerializationState<boolean>('compact', false);

/**
 * EXPERIMENTAL
 *
 * The {@link SerializationOverrideFn} to consult for each node, normally
 * compiled from `jsonOverride` declarations by `SerializationExtension`.
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

/**
 * Serialization is a synchronous depth-first walk, so the active context is
 * module scope with strict stack discipline rather than something attached to
 * the editor: there is exactly one export in flight at a time.
 */
let activeContext: null | SerializationContextRecord = null;

/**
 * EXPERIMENTAL
 *
 * Read a serialization context value. Outside of an export (or for a config
 * the active context does not set) this is the config's default.
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
 * EXPERIMENTAL
 *
 * Run `f` with the given serialization context values, which apply to any
 * export it performs (`editorState.toJSON()`, `node.exportJSON()` through the
 * export walk, and so on). Values not given are inherited from the enclosing
 * context.
 *
 * @example
 * ```ts
 * const compactJSON = $withSerializationContext([
 *   [SerializationContextCompact, true],
 * ])(() => editorState.toJSON());
 * ```
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

const composedFieldsByClass = new Map<
  Klass<LexicalNode>,
  Record<string, AnySerializationSchema>
>();

/**
 * The `json` schema fields a node has, including those it inherits from its
 * ancestors (an ElementNode subclass gets `direction`/`format`/… from the
 * schema ElementNode publishes). Compiled once per class.
 *
 * @internal
 */
function getComposedSchemaFields(
  klass: Klass<LexicalNode>,
): Record<string, AnySerializationSchema> {
  let fields = composedFieldsByClass.get(klass);
  if (fields === undefined) {
    fields = {};
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
    composedFieldsByClass.set(klass, fields);
  }
  return fields;
}

/**
 * Drop everything the compact form leaves out: the deprecated `version`, and
 * any node-specific property whose value is exactly its schema default.
 *
 * `children` and `$slots` are structural rather than schema-declared, so they
 * are never dropped here; the walk owns them.
 *
 * @internal
 */
export function $compactSerializedNode(
  node: LexicalNode,
  json: SerializedLexicalNode,
): SerializedLexicalNode {
  const fields = getComposedSchemaFields(
    node.constructor as Klass<LexicalNode>,
  );
  const compact: Record<string, unknown> = {...json};
  delete compact.version;
  for (const [key, schema] of Object.entries(fields)) {
    if (key in compact && compact[key] === schema.defaultValue) {
      delete compact[key];
    }
  }
  return compact as unknown as SerializedLexicalNode;
}

/**
 * EXPERIMENTAL
 *
 * Export one node's JSON with the active serialization context applied: any
 * installed override runs (and may replace the node or return `null` to omit
 * it), and what survives is compacted when the context asks for it.
 *
 * Use this instead of calling `node.exportJSON()` directly when writing a
 * serialization walk of your own — it is what `editorState.toJSON()` and the
 * `@lexical/clipboard` selection export both call, so a context set with
 * {@link $withSerializationContext} governs every one of them alike.
 */
export function $exportNodeJSON(
  node: LexicalNode,
): SerializedLexicalNode | null {
  return $applySerializationContext(node, false);
}

/**
 * Apply the active serialization context to one node: consult the installed
 * override (which may replace or omit the node), then compact what survives
 * when the context asks for it. Returns `null` when the node was omitted.
 *
 * @internal
 */
export function $applySerializationContext(
  node: LexicalNode,
  isRoot: boolean,
): SerializedLexicalNode | null {
  const override = $getSerializationContextValue(SerializationContextOverride);
  const result = override
    ? override(node, () => node.exportJSON())
    : node.exportJSON();
  if (result === null) {
    invariant(
      !isRoot,
      'LexicalSerializationContext: a serialization override omitted the root node, but a document must have one',
    );
    return null;
  }
  return $getSerializationContextValue(SerializationContextCompact)
    ? $compactSerializedNode(node, result)
    : result;
}
