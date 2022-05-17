/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from '../../flow/LexicalMarkdown';

export function indexBy<T>(
  list: Array<T>,
  callback: (T) => string,
): $ReadOnly<{[string]: Array<T>}> {
  const index = {};
  for (const item of list) {
    const key = callback(item);
    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }
  return index;
}

export function transformersByType(
  transformers: Array<Transformer>,
): $ReadOnly<{
  element: Array<ElementTransformer>,
  textFormat: Array<TextFormatTransformer>,
  textMatch: Array<TextMatchTransformer>,
}> {
  const byType = indexBy(transformers, (t) => t.type);
  return {
    // $FlowFixMe
    element: byType.element,
    // $FlowFixMe
    textFormat: byType['text-format'],
    // $FlowFixMe
    textMatch: byType['text-match'],
  };
}
