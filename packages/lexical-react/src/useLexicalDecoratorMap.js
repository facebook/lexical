/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {DecoratorMap, DecoratorStateValue} from 'lexical';

import {useCallback, useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function useLexicalDecoratorMap<V: DecoratorStateValue>(
  decoratorMap: DecoratorMap,
  key: string,
  initialValue: () => V | V,
): [V, (DecoratorStateValue) => void] {
  const value: V = decoratorMap.has(key)
    ? // $FlowFixMe: Flow isn't intelligent enough to understand the has check above
      ((decoratorMap.get(key): any): DecoratorStateValue)
    : typeof initialValue === 'function'
    ? initialValue()
    : initialValue;
  const [latestValue, setReactValue] = useState<DecoratorStateValue>(value);

  const setter = useCallback((nextValue: DecoratorStateValue) => {
    setReactValue(nextValue);
  }, []);

  useLayoutEffect(() => {
    const prevValue = decoratorMap.get(key);
    if (prevValue !== latestValue) {
      decoratorMap.set(key, latestValue);
    }
  }, [key, latestValue, decoratorMap]);

  return [value, setter];
}
