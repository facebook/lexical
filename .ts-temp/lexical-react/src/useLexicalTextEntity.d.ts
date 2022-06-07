/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EntityMatch } from '@lexical/text';
import type { TextNode } from 'lexical';
import { Class } from 'utility-types';
export declare function useLexicalTextEntity<N extends TextNode>(getMatch: (text: string) => null | EntityMatch, targetNode: Class<N>, createNode: (textNode: TextNode) => N): void;
