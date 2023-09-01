/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer } from '@lexical/markdown';
import { ElementNode } from 'lexical';
export declare function parseMarkdownString(parentNode: ElementNode, lines: string[], byType: Readonly<{
    element: Array<ElementTransformer>;
    textFormat: Array<TextFormatTransformer>;
    textMatch: Array<TextMatchTransformer>;
}>): void;
export declare function createMarkdownImport(transformers: Array<Transformer>): (markdownString: string, node?: ElementNode) => void;
