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

export type StateGetter<V> = <T extends LexicalNode>(node: T) => V;
export type StateSetter<V> = <T extends LexicalNode>(
  node: T,
  valueOrUpdater: V | ((prevValue: V) => V),
) => T;

export class StateConfig<K extends string, V> {
  readonly key: K;
  readonly parse: (value?: unknown) => V;
  readonly valueToJSON: (value: V) => unknown;
  readonly isEqual: (a: V, b: V) => boolean;
  readonly defaultValue: V;
  readonly $get: StateGetter<V>;
  readonly $set: StateSetter<V>;
  constructor(key: K, config: StateValueConfig<V>) {
    this.key = key;
    this.parse = config.parse.bind(config);
    this.valueToJSON = (config.valueToJSON || coerceToJSON).bind(config);
    this.isEqual = (config.isEqual || Object.is).bind(config);
    this.defaultValue = this.parse(undefined);
    this.$get = (node) => $getState(node, this);
    this.$set = (node, value) => $setState(node, this, value);
  }
  get accessors(): [$get: this['$get'], $set: this['$set']] {
    return [this.$get, this.$set];
  }
  nodeGetter<T extends LexicalNode>(): (this: T) => V {
    const cfg = this;
    return function $get(this: T) {
      return $getState(this, cfg);
    };
  }
  nodeSetter<T extends LexicalNode>(): (
    this: T,
    valueOrUpdater: V | ((prevValue: V) => V),
  ) => T {
    const cfg = this;
    return function $set(
      this: T,
      valueOrUpdater: V | ((prevValue: V) => V),
    ): T {
      return $setState(this, cfg, valueOrUpdater);
    };
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
 */
export interface StateValueConfig<V> {
  /**
   * This function must return a default value when called with undefined,
   * otherwise it should parse the given JSON value to your type V.
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
   * You may specify a function that converts V back to JSON.
   * This is mandatory when V is not a JSON serializable type.
   */
  valueToJSON?: (parsed: V) => unknown;
  /**
   * Used to define the equality function so you can use an Array or Object
   * as V and still omit default values from the exported JSON.
   */
  isEqual?: (a: V, b: V) => boolean;
}

/**
 * Create a StateConfig for the given string key and StateValueConfig.
 *
 * The key must be locally unique. In dev you wil get a key collision error
 * when you use two separate StateConfig on the same node with the same key.
 *
 * @param key The key to use
 * @param config Configuration for the value type
 * @returns a StateConfig for use with {@link $getState} and {@link $setState}
 */
export function createState<K extends string, V>(
  key: K,
  config: StateValueConfig<V>,
): StateConfig<K, V> {
  return new StateConfig(key, config);
}

export function $getState<K extends string, V>(
  node: LexicalNode,
  cfg: StateConfig<K, V>,
) {
  const latest = node.getLatest();
  const state = latest.__state;
  if (state) {
    $registerConfigToState(node, cfg, state);
    const known = state.knownState.get(cfg) as undefined | V;
    if (known !== undefined) {
      return known;
    } else if (state.unknownState && cfg.key in state.unknownState) {
      const jsonValue = state.unknownState[cfg.key];
      const parsed =
        jsonValue === undefined
          ? cfg.defaultValue
          : cfg.parse(state.unknownState[cfg.key]);
      state.knownState.set(cfg, parsed);
      return parsed;
    }
  }
  return cfg.defaultValue;
}

function $registerConfigToState<Node extends LexicalNode, K extends string, V>(
  node: Node,
  cfg: StateConfig<K, V>,
  state: NodeState<Node>,
): void {
  const collision = state.sharedConfigMap.get(cfg.key);
  if (collision === undefined) {
    state.sharedConfigMap.set(cfg.key, cfg);
  } else if (collision !== cfg) {
    if (__DEV__) {
      invariant(
        false,
        '$setState: State key collision %s detected in %s node with type %s and key %s. Only one StateConfig with a given key should be used on a node.',
        JSON.stringify(cfg.key),
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
 * @param node The LexicalNode to set the state on
 * @param cfg The configuration for this state
 * @param valueOrUpdater The value or updater function
 * @returns node
 */
export function $setState<Node extends LexicalNode, K extends string, V>(
  node: Node,
  cfg: StateConfig<K, V>,
  valueOrUpdater: V | ((prevValue: V) => V),
): Node {
  errorOnReadOnly();
  let value: V;
  if (typeof valueOrUpdater === 'function') {
    const latest = node.getLatest();
    const prevValue = $getState(latest, cfg);
    value = (valueOrUpdater as (v: V) => V)(prevValue);
    if (cfg.isEqual(prevValue, value)) {
      return latest;
    }
  } else {
    value = valueOrUpdater;
  }
  const writable = node.getWritable();
  const state = $getWritableNodeState(writable);
  $registerConfigToState(node, cfg, state);
  state.knownState.set(cfg, value);
  return writable;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnownStateMap = Map<StateConfig<any, any>, unknown>;
type UnknownStateRecord = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharedConfigMap = Map<string, StateConfig<any, any>>;

export class NodeState<T extends LexicalNode> {
  readonly node: LexicalNode;

  /**
   * State that has already been parsed in a get state, so it is safe. (can be returned with
   * just a cast since the proof was given before).
   *
   * Note that it uses StateConfig, so in addition to (1) the CURRENT VALUE, it has access to
   * (2) the State key (3) the DEFAULT VALUE and (4) the PARSE FUNCTION
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly knownState: KnownStateMap;

  /**
   * It is a copy of serializedNode.state that is made when JSON is imported but has not been parsed yet.
   * It stays here until a get state requires us to parse it, and since we then know the value is safe we move it to knownState
   *
   * note that it uses string as keys instead of StateConfig so it has no way to parse at export time.
   * In exportJSON, we only parse knownState to save the default value which is not exported.
   * For safety, we parse unknownState in get state.
   */
  unknownState: undefined | UnknownStateRecord;

  readonly sharedConfigMap: SharedConfigMap;

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

  getInternalState(): [
    {readonly [k in string]: unknown} | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ReadonlyMap<StateConfig<any, any>, unknown>,
  ] {
    return [this.unknownState, this.knownState];
  }

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

  updateFromJSON(unknownState: undefined | UnknownStateRecord) {
    const {knownState, sharedConfigMap} = this;
    for (const cfg of this.knownState.keys()) {
      knownState.set(cfg, cfg.defaultValue);
    }
    const nextUnknownState: UnknownStateRecord = {};
    if (unknownState) {
      for (const [k, v] of Object.entries(unknownState)) {
        const cfg = sharedConfigMap.get(k);
        if (cfg) {
          knownState.set(cfg, cfg.parse(v));
        } else {
          nextUnknownState[k] = v;
        }
      }
    }
    this.unknownState = undefinedIfEmpty(nextUnknownState);
  }
}

function undefinedIfEmpty<T extends object>(obj: undefined | T): undefined | T {
  if (obj) {
    for (const key in obj) {
      return obj;
    }
  }
  return undefined;
}

function cloneUnknownState(
  unknownState: undefined | UnknownStateRecord,
): undefined | UnknownStateRecord {
  return undefinedIfEmpty(unknownState) && {...unknownState};
}

/** @internal */
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
