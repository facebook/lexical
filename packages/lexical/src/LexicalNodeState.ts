/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/* eslint-disable dot-notation */

import {LexicalNode} from './LexicalNode';

/**
 * NOTE: we parse in getState and setState, but not in importJSON or exportJSON. Ideally,
 * the normal thing would be the other way around. The reason we do it this way is because
 * we don't have a composable way to declare states (or plugins), prior to creating the
 * editor. Maybe later with something like https://lexical-builder.pages.dev/.
 */

export type DeepImmutable<T> = T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepImmutable<K>, DeepImmutable<V>>
  : T extends Set<infer S>
  ? ReadonlySet<DeepImmutable<S>>
  : T extends object
  ? {
      readonly [K in keyof T]: DeepImmutable<T[K]>;
    }
  : T;

export type State = {
  [Key in string]?: string | number | boolean | null | undefined | State;
};

type StateValue = State[keyof State];

export function createState<K extends string, T extends StateValue>(
  key: K,
  config: {parse: (value: unknown) => T},
) {
  // We create a stateConfig with a default value to save some work later
  const stateConfig = {
    defaultValue: config.parse(undefined),
    key,
    parse: config.parse,
  };

  const $get = (node: LexicalNode): DeepImmutable<T> => {
    // 1. We first try to get the value from the knownState
    const state = node.getLatest().__state;
    const value = state['knownState'].get(stateConfig) as DeepImmutable<T>;
    if (value !== undefined) {
      return value;
    }

    // 2. If the value is not in the knownState, we try to get it from the unknownState
    // and set it in the knownState Map (even if it's a default, so we don't parse again).
    const unknownValue = state['unknownState'][key];
    delete state['unknownState'][key];
    const parsedValue = config.parse(unknownValue) as DeepImmutable<T>;
    state['knownState'].set(stateConfig, parsedValue);

    // We check collisions (the same string key used on the same node instance in 2 different `createState`)
    // We could use a reverse map to avoid a lookup (Map<StateConfig, StateValue>), but it seems overkill.
    state['knownState'].forEach((_, currentStateConfig) => {
      if (
        currentStateConfig.key === key &&
        currentStateConfig !== stateConfig
      ) {
        throw new Error(`State key collision detected: ${key}`);
      }
    });

    return parsedValue;
  };

  const $set = (node: LexicalNode, value: T) => {
    const self = node.getWritable();
    self.__state = self.__state['clone']();
    const parsedValue = config.parse(value);
    delete self.__state['unknownState'][key];
    self.__state['knownState'].set(stateConfig, parsedValue);
  };

  return {$get, $set};
}

interface StateConfig<
  K extends string = string,
  V extends StateValue = StateValue,
> {
  readonly key: K;
  readonly defaultValue: DeepImmutable<V>;
  readonly parse: (value: unknown) => V;
}

export class NodeState {
  /**
   * State that has already been parsed in a get state, so it is safe. (can be returned with
   * just a cast since the proof was given before).
   *
   * Note that it uses StateConfig, so in addition to (1) the CURRENT VALUE, it has access to
   * (2) the State key (3) the DEFAULT VALUE and (4) the PARSE FUNCTION
   */
  private knownState: Map<StateConfig, StateValue> = new Map();

  /**
   * It is a copy of serializedNode.state that is made when JSON is imported but has not been parsed yet.
   * It stays here until a get state requires us to parse it, and since we then know the value is safe we move it to knownState
   *
   * note that it uses string as keys instead of StateConfig so it has no way to parse at export time.
   * In exportJSON, we only parse knownState to save the default value which is not exported.
   * For safety, we parse unknownState in get state.
   */
  private unknownState: Record<string, unknown> = {};

  private toJSON(): State {
    const state = {...this.unknownState};
    this.knownState.forEach((stateValue, stateConfig) => {
      if (stateValue !== stateConfig.defaultValue) {
        state[stateConfig.key] = stateConfig.parse(stateValue);
      }
    });
    return state as State;
  }

  private clone() {
    const newState = new NodeState();
    newState.unknownState = {...this.unknownState};
    newState.knownState = new Map(this.knownState);
    return newState;
  }
}
