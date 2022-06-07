/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer } from '@lexical/markdown';
export declare function indexBy<T>(list: Array<T>, callback: (arg0: T) => string): Readonly<Record<string, Array<T>>>;
export declare function transformersByType(transformers: Array<Transformer>): Readonly<{
    element: Array<ElementTransformer>;
    textFormat: Array<TextFormatTransformer>;
    textMatch: Array<TextMatchTransformer>;
}>;
export declare const PUNCTUATION_OR_SPACE: RegExp;
