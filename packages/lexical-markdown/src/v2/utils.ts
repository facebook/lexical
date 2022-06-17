/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementTransformer,
  TextFormatTransformer,
  TextMatchTransformer,
  Transformer,
} from '@lexical/markdown';

export function indexBy<T>(
  list: Array<T>,
  callback: (arg0: T) => string,
): Readonly<Record<string, Array<T>>> {
  const index: Record<string, Array<T>> = {};

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

export function transformersByType(transformers: Array<Transformer>): Readonly<{
  element: Array<ElementTransformer>;
  textFormat: Array<TextFormatTransformer>;
  textMatch: Array<TextMatchTransformer>;
}> {
  const byType = indexBy(transformers, (t) => t.type);

  return {
    element: byType.element as Array<ElementTransformer>,
    textFormat: byType['text-format'] as Array<TextFormatTransformer>,
    textMatch: byType['text-match'] as Array<TextMatchTransformer>,
  };
}

export const PUNCTUATION_OR_SPACE = /[!-/:-@[-`{-~\s]/;
