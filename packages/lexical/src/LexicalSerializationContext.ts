/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  setSerializationInterceptor,
} from './LexicalSerializedExport';

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
 * The interceptor `$applySerializationContext` dispatches to once
 * `$withSerializationContext` has installed it: ask the node for the form the
 * active context wants. With no context active it reduces to the plain
 * validated export, so installation alone changes nothing.
 */
function $applyActiveSerializationContext(
  node: LexicalNode,
): SerializedLexicalNode {
  // Installed for the process once any context is used, but most exports run
  // outside one, and the compact flag is the only thing to read.
  return $validatedExportJSON(
    node,
    getContextRecord(SerializationContextSymbol, SerializationScope) !==
      undefined && $getSerializationContextValue(SerializationContextCompact),
  );
}
