/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {LexicalNode} from 'lexical';

import {SerializedLexicalNode} from 'lexical';

export type Klass<T extends LexicalNode> = {
  new (...args: any[]): T;
} & Omit<LexicalNode, 'constructor'>;
