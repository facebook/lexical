/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorMap, DecoratorStateValue} from 'lexical';

import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

function getInitialMapValue<V: DecoratorStateValue>(
  decoratorMap: DecoratorMap,
  key: string,
  initialValue: () => V | V,
): V {
  // $FlowFixMe: Flow struggles with the generic
  const value: V | void = decoratorMap.get(key);
  if (value !== undefined) {
    return value;
  }
  return typeof initialValue === 'function' ? initialValue() : initialValue;
}

export default function useLexicalDecoratorMap<V: DecoratorStateValue>(
  decoratorMap: DecoratorMap,
  key: string,
  initialValue: () => V | V,
): [V, (DecoratorStateValue) => void] {
  const value: V = getInitialMapValue<V>(decoratorMap, key, initialValue);
  const [latestValue, setReactValue] = useState<DecoratorStateValue>(value);

  useLayoutEffect(() => {
    const prevValue = decoratorMap.get(key);
    if (prevValue !== latestValue) {
      decoratorMap.set(key, latestValue);
    }
  }, [key, latestValue, decoratorMap]);

  return [value, setReactValue];
}
