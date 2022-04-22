/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DecoratorNode, LexicalEditor} from 'lexical';

export function registerMarkdownShortcuts<T>(
  editor: LexicalEditor,
  createHorizontalRuleNode: () => DecoratorNode<T>,
): () => void;
export function $convertFromMarkdownString(
  markdownString: string,
  editor: LexicalEditor,
): void;
export function $convertToMarkdownString(): string;
