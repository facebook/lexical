/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DecoratorMap, DecoratorStateValue} from 'lexical';
export default function useLexicalDecoratorMap<V extends DecoratorStateValue>(
  decoratorMap: DecoratorMap,
  key: string,
  initialValue: (() => V) | V,
): [V, (arg0: DecoratorStateValue) => void];
