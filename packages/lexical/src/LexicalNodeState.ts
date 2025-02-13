/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from './LexicalNode';

import invariant from 'shared/invariant';

import {errorOnReadOnly} from './LexicalUpdates';

function coerceToJSON(v: unknown): unknown {
  return v;
}

/**
 * The return value of {@link createState}, for use with
 * {@link $getState} and {@link $setState}.
 */
export class StateConfig<K extends string, V> {
  /** The string key used when serializing this state to JSON */
  readonly key: K;
  /** The parse function from the StateValueConfig passed to createState */
  readonly parse: (value?: unknown) => V;
  /**
   * The valueToJSON function from the StateValueConfig passed to createState,
   * with a default that is simply a pass-through that assumes the value is
   * JSON serializable.
   */
  readonly valueToJSON: (value: V) => unknown;
  /**
   * An equality function from the StateValueConfig, with a default of
   * Object.is.
   */
  readonly isEqual: (a: V, b: V) => boolean;
  /**
   * The result of `stateValueConfig.parse(undefined)`, which is computed only
   * once and used as the default value. When the current value `isEqual` to
   * the `defaultValue`, it will not be serialized to JSON.
   */
  readonly defaultValue: V;
  constructor(key: K, stateValueConfig: StateValueConfig<V>) {
    this.key = key;
    this.parse = stateValueConfig.parse.bind(stateValueConfig);
    this.valueToJSON = (stateValueConfig.valueToJSON || coerceToJSON).bind(
      stateValueConfig,
    );
    this.isEqual = (stateValueConfig.isEqual || Object.is).bind(
      stateValueConfig,
    );
    this.defaultValue = this.parse(undefined);
  }
}

/**
 * Configure a value to be used with StateConfig.
 *
 * The value type should be inferred from the definition of parse.
 *
 * If the value type is not JSON serializable, then valueToJSON must also be provided.
 *
 * Values should be treated as immutable, much like React.useState. Mutating
 * stored values directly will cause unpredictable behavior, is not supported,
 * and may trigger errors in the future.
 *
 * @example
 * ```ts
 * const numberOrNullState = createState('numberOrNull', {parse: (v) => typeof v === 'number' ? v : null});
 * //    ^? State<'numberOrNull', StateValueConfig<number | null>>
 * const numberState = createState('number', {parse: (v) => typeof v === 'number' ? v : 0});
 * //    ^? State<'number', StateValueConfig<number>>
 * ```
 *
 * Only the parse option is required, it is generally not useful to
 * override `valuetoJSON` or `isEqual`. However, if you are using
 * non-primitive types such as Array, Object, Date, or something
 * more exotic then you would want to override this. In these
 * cases you might want to reach for third party libraries.
 *
 * @example
 * ```ts
 * const isoDateState = createState('isoDate', {
 *   parse: (v): null | Date => {
 *     const date = typeof v === 'string' ? new Date(v) : null;
 *     return date && !isNaN(date.valueOf()) ? date : null;
 *   }
 *   isEqual: (a, b) => a === b || (a && b && a.valueOf() === b.valueOf()),
 *   valueToJSON: (v) => v && v.toString()
 * });
 * ```
 *
 * You may find it easier to write a parse function using libraries like
 * zod, valibot, ajv, Effect, TypeBox, etc. perhaps with a wrapper function.
 */
export interface StateValueConfig<V> {
  /**
   * This function must return a default value when called with undefined,
   * otherwise it should parse the given JSON value to your type V. Note
   * that it is not required to copy or clone the given value, you can
   * pass it directly through if it matches the expected type.
   *
   * When you encounder an invalid value, it's up to you to decide
   * as to whether to ignore it and return the defaut value,
   * return some non-default error value, or throw an error.
   *
   * It is possible for V to include undefined, but if it does, then
   * it should also be considered the default value since undefined
   * can not be serialized to JSON so it is indistinguishable from the
   * default.
   *
   * Similarly, if your V is a function, then usage of {@link $setState}
   * must use an updater function because your type will be indistinguishable
   * from an updater function.
   */
  parse: (jsonValue: unknown) => V;
  /**
   * This is optional and for advanced use cases only.
   *
   * You may specify a function that converts V back to JSON.
   * This is mandatory when V is not a JSON serializable type.
   */
  valueToJSON?: (parsed: V) => unknown;
  /**
   * This is optional and for advanced use cases only.
   *
   * Used to define the equality function so you can use an Array or Object
   * as V and still omit default values from the exported JSON.
   *
   * The default is `Object.is`, but something like `fast-deep-equal` might be
   * more appropriate for your use case.
   */
  isEqual?: (a: V, b: V) => boolean;
}

/**
 * Create a StateConfig for the given string key and StateValueConfig.
 *
 * The key must be locally unique. In dev you wil get a key collision error
 * when you use two separate StateConfig on the same node with the same key.
 *
 * The returned StateConfig value should be used with {@link $getState} and
 * {@link $setState}.
 *
 * @param key The key to use
 * @param valueConfig Configuration for the value type
 * @returns a StateConfig
 */
export function createState<K extends string, V>(
  key: K,
  valueConfig: StateValueConfig<V>,
): StateConfig<K, V> {
  return new StateConfig(key, valueConfig);
}

/**
 * The accessor for working with node state
 *
 * @param node Any LexicalNode
 * @param stateConfig The configuration of the state to read
 * @returns The current value from the state, or the default value provided by the configuration.
 */
export function $getState<K extends string, V>(
  node: LexicalNode,
  stateConfig: StateConfig<K, V>,
) {
  const latest = node.getLatest();
  const state = latest.__state;
  if (state) {
    $registerConfigToState(node, stateConfig, state);
    const known = state.knownState.get(stateConfig) as undefined | V;
    if (known !== undefined) {
      return known;
    } else if (state.unknownState && stateConfig.key in state.unknownState) {
      const jsonValue = state.unknownState[stateConfig.key];
      const parsed =
        jsonValue === undefined
          ? stateConfig.defaultValue
          : stateConfig.parse(state.unknownState[stateConfig.key]);
      state.knownState.set(stateConfig, parsed);
      return parsed;
    }
  }
  return stateConfig.defaultValue;
}

/**
 * @internal
 *
 * Register the config to this node's sharedConfigMap and throw an exception in
 * `__DEV__` when a collision is detected.
 */
function $registerConfigToState<Node extends LexicalNode, K extends string, V>(
  node: Node,
  stateConfig: StateConfig<K, V>,
  state: NodeState<Node>,
): void {
  const collision = state.sharedConfigMap.get(stateConfig.key);
  if (collision === undefined) {
    state.sharedConfigMap.set(stateConfig.key, stateConfig);
  } else if (collision !== stateConfig) {
    if (__DEV__) {
      invariant(
        false,
        '$setState: State key collision %s detected in %s node with type %s and key %s. Only one StateConfig with a given key should be used on a node.',
        JSON.stringify(stateConfig.key),
        node.constructor.name,
        node.getType(),
        node.getKey(),
      );
    }
  }
}

/**
 * Set the state defined by cfg on node. Like with `React.useState` you may
 * directly specify the value or use an updater function that will be called
 * with the previous value of the state on that node (which will be the
 * `cfg.defaultValue` if not set).
 *
 * When an updater function is used, the node will only be marked dirty if
 * `cfg.isEqual(prevValue, value)` is false.
 *
 * @example
 * ```ts
 * const toggle = createState('toggle', {parse: Boolean});
 * // set it direction
 * $setState(node, counterState, true);
 * // use an updater
 * $setState(node, counterState, (prev) => !prev);
 * ```
 *
 * @param node The LexicalNode to set the state on
 * @param stateConfig The configuration for this state
 * @param valueOrUpdater The value or updater function
 * @returns node
 */
export function $setState<Node extends LexicalNode, K extends string, V>(
  node: Node,
  stateConfig: StateConfig<K, V>,
  valueOrUpdater: V | ((prevValue: V) => V),
): Node {
  errorOnReadOnly();
  let value: V;
  if (typeof valueOrUpdater === 'function') {
    const latest = node.getLatest();
    const prevValue = $getState(latest, stateConfig);
    value = (valueOrUpdater as (v: V) => V)(prevValue);
    if (stateConfig.isEqual(prevValue, value)) {
      return latest;
    }
  } else {
    value = valueOrUpdater;
  }
  const writable = node.getWritable();
  const state = $getWritableNodeState(writable);
  $registerConfigToState(node, stateConfig, state);
  state.knownState.set(stateConfig, value);
  return writable;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnownStateMap = Map<StateConfig<any, any>, unknown>;
type UnknownStateRecord = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharedConfigMap = Map<string, StateConfig<any, any>>;

/**
 * @internal
 */
export class NodeState<T extends LexicalNode> {
  /**
   * @internal
   *
   * Track the (versioned) node that this NodeState was created for, to
   * facilitate copy-on-write for NodeState. When a LexicalNode is cloned,
   * it will *reference* the NodeState from its prevNode. From the nextNode
   * you can continue to read state without copying, but the first $setState
   * will trigger a copy of the prevNode's NodeState with the node property
   * updated.
   */
  readonly node: LexicalNode;

  /**
   * @internal
   *
   * State that has already been parsed in a get state, so it is safe. (can be returned with
   * just a cast since the proof was given before).
   *
   * Note that it uses StateConfig, so in addition to (1) the CURRENT VALUE, it has access to
   * (2) the State key (3) the DEFAULT VALUE and (4) the PARSE FUNCTION
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly knownState: KnownStateMap;

  /**
   * @internal
   *
   * A copy of serializedNode.state that is made when JSON is imported but
   * has not been parsed yet.
   *
   * It stays here until a get state requires us to parse it, and since we
   * then know the value is safe we move it to knownState and garbage collect
   * it at the next version.
   *
   * Note that since only string keys are used here, we can only allow this
   * state to pass-through on export or on the next version since there is
   * no known value configuration. This pass-through is to support scenarios
   * where multiple versions of the editor code are working in parallel so
   * an old version of your code doesnt erase metadata that was
   * set by a newer version of your code.
   */
  unknownState: undefined | UnknownStateRecord;

  /**
   * @internal
   *
   * This sharedConfigMap is preserved across all versions of a given node and
   * remains writable. It is how keys are resolved to configuration.
   */
  readonly sharedConfigMap: SharedConfigMap;

  /**
   * @internal
   */
  constructor(
    node: T,
    sharedConfigMap: SharedConfigMap = new Map(),
    unknownState: undefined | UnknownStateRecord = undefined,
    knownState: KnownStateMap = new Map(),
  ) {
    this.node = node;
    this.sharedConfigMap = sharedConfigMap;
    this.unknownState = unknownState;
    this.knownState = knownState;
  }

  /**
   * @internal
   *
   * Used only for advanced use cases, such as collab. The intent here is to
   * allow you to diff states with a more stable interface than the properties
   * of this class.
   */
  getInternalState(): [
    {readonly [k in string]: unknown} | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReadonlyMap<StateConfig<any, any>, unknown>,
  ] {
    return [this.unknownState, this.knownState];
  }

  /**
   * Encode this NodeState to JSON in the format that its node expects.
   * This returns `{state?: UnknownStateRecord}` rather than
   * `UnknownStateRecord | undefined` so that we can support flattening
   * specific entries in the future when nodes can declare what
   * their required StateConfigs are.
   */
  toJSON(excludeDefaults = true): {state?: UnknownStateRecord} {
    const state = {...this.unknownState};
    for (const [cfg, v] of this.knownState) {
      if (excludeDefaults && cfg.isEqual(v, cfg.defaultValue)) {
        delete state[cfg.key];
      } else {
        state[cfg.key] = cfg.valueToJSON(v);
      }
    }
    return undefinedIfEmpty(state) ? {state} : {};
  }

  /**
   * @internal
   *
   * A NodeState is writable when the node to update matches
   * the node associated with the NodeState. This basically
   * mirrors how the EditorState NodeMap works, but in a
   * bottom-up organization rather than a top-down organization.
   *
   * This allows us to implement the same "copy on write"
   * pattern for state, without having the state version
   * update every time the node version changes (e.g. when
   * its parent or siblings change).
   *
   * @param node The node to associate with the state
   * @returns The next writaable state
   */
  getWritable(node: T): NodeState<T> {
    if (this.node === node) {
      return this;
    }
    const nextKnownState = new Map(this.knownState);
    const nextUnknownState = cloneUnknownState(this.unknownState);
    if (nextUnknownState) {
      for (const cfg of nextKnownState.keys()) {
        delete nextUnknownState[cfg.key];
      }
    }
    return new NodeState(
      node,
      this.sharedConfigMap,
      undefinedIfEmpty(nextUnknownState),
      nextKnownState,
    );
  }

  /**
   * @internal
   *
   * This is intended for advanced use cases only, such
   * as collab or dev tools.
   *
   * Update a single key value pair from unknown state,
   * parsing it if the key is known to this node. This is
   * basically like updateFromJSON, but the effect is
   * isolated to a single entry.
   *
   * @param k The string key from an UnknownStateRecord
   * @param v The unknown value from an UnknownStateRecord
   */
  updateFromUnknown(k: string, v: unknown) {
    const cfg = this.sharedConfigMap.get(k);
    if (cfg) {
      this.knownState.set(cfg, cfg.parse(v));
    } else if (this.unknownState) {
      this.unknownState[k] = v;
    } else {
      this.unknownState = {[k]: v};
    }
  }

  /**
   * @internal
   *
   * Reset all existing state to default or empty values,
   * and perform any updates from the given unknownState.
   *
   * This is used when initializing a node's state from JSON,
   * or when resetting a node's state from JSON.
   *
   * @param unknownState The new state in serialized form
   */
  updateFromJSON(unknownState: undefined | UnknownStateRecord): void {
    const {knownState, sharedConfigMap} = this;
    // Reset all known state to defaults
    for (const cfg of this.knownState.keys()) {
      knownState.set(cfg, cfg.defaultValue);
    }
    const nextUnknownState: UnknownStateRecord = {};
    if (unknownState) {
      for (const [k, v] of Object.entries(unknownState)) {
        // This is an inlined version of updateFromUnknown for performance
        // reasons
        const cfg = sharedConfigMap.get(k);
        if (cfg) {
          // We know how to parse this entry, so it goes directly to known
          knownState.set(cfg, cfg.parse(v));
        } else {
          // Unknown entry, save for later parsing
          nextUnknownState[k] = v;
        }
      }
    }
    this.unknownState = undefinedIfEmpty(nextUnknownState);
  }
}

/**
 * Return obj if it is an object with at least one property, otherwise
 * return undefined.
 */
function undefinedIfEmpty<T extends object>(obj: undefined | T): undefined | T {
  if (obj) {
    for (const key in obj) {
      return obj;
    }
  }
  return undefined;
}

/**
 * Return undefined if unknownState is undefined or an empty object,
 * otherwise return a shallow clone of it.
 */
function cloneUnknownState(
  unknownState: undefined | UnknownStateRecord,
): undefined | UnknownStateRecord {
  return undefinedIfEmpty(unknownState) && {...unknownState};
}

/**
 * @internal
 *
 * Only for direct use in very advanced integrations, such as lexical-yjs.
 * Typically you would only use {@link createState}, {@link $getState}, and
 * {@link $setState}. This is effectively the preamble for {@link $setState}.
 */
export function $getWritableNodeState<T extends LexicalNode>(
  node: T,
): NodeState<T> {
  const writable = node.getWritable();
  const state = writable.__state
    ? writable.__state.getWritable(writable)
    : new NodeState(writable);
  writable.__state = state;
  return state;
}

/**
 * @internal
 *
 * This is used to implement LexicalNode.updateFromJSON and is
 * not intended to be exported from the package.
 *
 * @param node any LexicalNode
 * @param unknownState undefined or a serialized State
 * @returns A writable version of node, with the state set.
 */
export function $updateStateFromJSON<T extends LexicalNode>(
  node: T,
  unknownState: undefined | UnknownStateRecord,
): T {
  const writable = node.getWritable();
  if (unknownState || writable.__state) {
    $getWritableNodeState(node).updateFromJSON(unknownState);
  }
  return writable;
}
