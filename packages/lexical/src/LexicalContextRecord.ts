/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';

import {createState, type StateConfig} from './LexicalNodeState';
import {$getEditor} from './LexicalUtils';

/**
 * A phantom brand: it has no runtime existence, so a config carries its
 * context's symbol purely in the type. Keeping the tag in *value* position
 * (rather than as a mapped key) is what lets a call site whose tag cannot be
 * inferred still type-check — the inferred fallback is `symbol`, and
 * `{[contextTag]?: SomeSymbol}` is assignable to `{[contextTag]?: symbol}`.
 */
declare const contextTag: unique symbol;

/**
 * @experimental
 *
 * Context with a phantom type for its purpose (such as
 * `DOMRenderContextSymbol`).
 *
 * A ContextRecord is a data structure used in pipelines that walk the editor
 * state — DOM export and import, JSON export — to pass information down the
 * chain without threading it through every call. Records are chained with
 * `Object.create`, so a child layer reads through to its parent and only the
 * values it overrides cost anything.
 */
export type ContextRecord<_K extends symbol> = Record<string | symbol, unknown>;

/**
 * @experimental
 *
 * A data structure much like StateConfig (they share implementation details)
 * but for managing context during a pipeline rather than individual node state.
 */
export type ContextConfig<Sym extends symbol, V> = StateConfig<symbol, V> & {
  readonly [contextTag]?: Sym;
};

/**
 * @experimental
 *
 * Update the context at `cfg` with updater, constructed with
 * {@link contextUpdater}
 */
export type ContextConfigUpdater<Ctx extends symbol, V> = {
  readonly cfg: ContextConfig<Ctx, V>;
  /**
   * @param prev The current or default value
   * @returns The new value
   */
  readonly updater: (prev: V) => V;
};

/**
 * @experimental
 *
 * Set the context at `cfg` to a specific value, constructed with
 * {@link contextValue}
 */
export type ContextConfigPair<Ctx extends symbol, V> = readonly [
  ContextConfig<Ctx, V>,
  V,
];

/**
 * @experimental
 *
 * Set or update a context value, constructed with {@link contextValue} or
 * {@link contextUpdater}
 */
export type ContextPairOrUpdater<Ctx extends symbol, V> =
  | ContextConfigPair<Ctx, V>
  | ContextConfigUpdater<Ctx, V>;

/** @experimental */
export type AnyContextConfigPairOrUpdater<Ctx extends symbol> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ContextPairOrUpdater<Ctx, any>;

/**
 * @experimental
 *
 * @param contextRecord The ContextRecord
 * @param cfg The configuration
 * @returns The value or defaultValue of cfg
 */
export function getContextValue<Ctx extends symbol, V>(
  contextRecord: undefined | ContextRecord<Ctx>,
  cfg: ContextConfig<Ctx, V>,
): V {
  const {key} = cfg;
  return contextRecord && key in contextRecord
    ? (contextRecord[key] as V)
    : cfg.defaultValue;
}

function toPair<Ctx extends symbol, V>(
  contextRecord: undefined | ContextRecord<Ctx>,
  pairOrUpdater: ContextConfigPair<Ctx, V> | ContextConfigUpdater<Ctx, V>,
): ContextConfigPair<Ctx, V> {
  if ('cfg' in pairOrUpdater) {
    const {cfg, updater} = pairOrUpdater;
    return [cfg, updater(getContextValue(contextRecord, cfg))];
  }
  return pairOrUpdater;
}

function createChildContext<Ctx extends symbol>(
  parent: undefined | ContextRecord<Ctx>,
): ContextRecord<Ctx> {
  return Object.create(parent || null);
}

/**
 * Construct a new context from a parent context and pairs. Returns `parent`
 * itself when no pair changes a value, so a caller can skip installing a layer
 * that would read identically.
 *
 * @experimental
 *
 * @param pairs The pairs and updaters to build the context from
 * @param parent The parent context
 * @returns The new context
 */
export function contextFromPairs<Ctx extends symbol>(
  pairs: readonly AnyContextConfigPairOrUpdater<Ctx>[],
  parent: undefined | ContextRecord<Ctx>,
): undefined | ContextRecord<Ctx> {
  let rval = parent;
  for (const pairOrUpdater of pairs) {
    const [k, v] = toPair(rval, pairOrUpdater);
    const key = k.key;
    if (rval === parent && getContextValue(rval, k) === v) {
      continue;
    }
    // If we haven't branched away from `parent` yet, create a fresh child
    // context so we never mutate the caller's parent record. Subsequent
    // pairs in this loop accumulate into the same child. Inside the loop
    // `rval` is non-null after the first iteration, since createChildContext
    // never returns null/undefined.
    const ctx: ContextRecord<Ctx> =
      rval === parent || rval === undefined ? createChildContext(parent) : rval;
    ctx[key] = v;
    rval = ctx;
  }
  return rval;
}

/**
 * Create a context config pair that sets a value in a context.
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function contextValue<Ctx extends symbol, V>(
  cfg: ContextConfig<Ctx, V>,
  value: V,
): ContextConfigPair<Ctx, V> {
  return [cfg, value];
}

/**
 * Create a context config updater that transforms a value in a context.
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function contextUpdater<Ctx extends symbol, V>(
  cfg: ContextConfig<Ctx, V>,
  updater: (prev: V) => V,
): ContextConfigUpdater<Ctx, V> {
  return {cfg, updater};
}

/**
 * @experimental
 * @internal
 * @__NO_SIDE_EFFECTS__
 */
export function createContextState<Tag extends symbol, V>(
  _tag: Tag,
  name: string,
  getDefaultValue: () => V,
  isEqual?: (a: V, b: V) => boolean,
): ContextConfig<Tag, V> {
  // `_tag` is type-only: the brand it names has no runtime representation, so
  // the config is just a StateConfig at runtime.
  return createState(Symbol(name), {
    isEqual,
    parse: getDefaultValue,
  }) as ContextConfig<Tag, V>;
}

/**
 * What an active {@link ContextRecord} is scoped to. Usually the editor whose
 * pipeline is running, but a pipeline with no editor of its own uses a
 * placeholder symbol instead: `EditorState.toJSON()` runs with the active
 * editor set to `null`, and a JSON export deliberately spans editors so a
 * nested one (an image caption) inherits the outer document's context.
 *
 * @experimental
 */
export type ContextScope = LexicalEditor | symbol;

interface ScopedContextRecord {
  readonly scope: ContextScope;
  readonly record: ContextRecord<symbol>;
}

// Scoped per context symbol rather than one shared scope for all of them, so
// installing a context for one pipeline cannot hide another pipeline's.
let activeContexts: undefined | {readonly [sym: symbol]: ScopedContextRecord} =
  undefined;

/**
 * @experimental
 *
 * @param sym The symbol for this ContextRecord (e.g. DOMRenderContextSymbol)
 * @param scope The editor (or placeholder) the context is scoped to
 * @returns The current context or undefined
 */
export function getContextRecord<Ctx extends symbol>(
  sym: Ctx,
  scope: ContextScope,
): undefined | ContextRecord<Ctx> {
  const entry = activeContexts && activeContexts[sym];
  return entry && entry.scope === scope ? entry.record : undefined;
}

/**
 * Not `@__NO_SIDE_EFFECTS__`: this installs a layer on the module-scope active
 * context and runs `f` inside it. A bundler told it were pure could drop a
 * call whose result is unused and never run `f` at all.
 *
 * @internal
 * @experimental
 */
export function $withFullContext<Ctx extends symbol, T>(
  sym: Ctx,
  contextRecord: ContextRecord<Ctx>,
  f: () => T,
  scope: ContextScope = $getEditor(),
): T {
  const previous = activeContexts;
  try {
    activeContexts = {...previous, [sym]: {record: contextRecord, scope}};
    return f();
  } finally {
    activeContexts = previous;
  }
}

/**
 * @internal
 * @experimental
 * @__NO_SIDE_EFFECTS__
 */
export function $withContext<
  Ctx extends symbol,
  Scope extends ContextScope = LexicalEditor,
>(
  sym: Ctx,
  $defaults: (scope: Scope) => undefined | ContextRecord<Ctx> = () => undefined,
) {
  return (
    cfg: readonly AnyContextConfigPairOrUpdater<Ctx>[],
    scope: Scope = $getEditor() as Scope,
  ): (<T>(f: () => T) => T) => {
    return f => {
      const parentContextRecord = getContextRecord(sym, scope);
      const contextRecord = contextFromPairs(
        cfg,
        parentContextRecord || $defaults(scope),
      );
      if (!contextRecord || contextRecord === parentContextRecord) {
        return f();
      }
      return $withFullContext(sym, contextRecord, f, scope);
    };
  };
}
