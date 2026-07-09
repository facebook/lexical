/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalHTMLElement} from '../../../types';

import {findAllLexicalElementsDeep} from 'lexical';

import {isLexicalNode} from '../../../utils/isLexicalNode';

export default function queryLexicalNodes(): LexicalHTMLElement[] {
  const out: LexicalHTMLElement[] = [];
  for (const el of findAllLexicalElementsDeep(document)) {
    if (isLexicalNode(el)) {
      out.push(el);
    }
  }
  return out;
}
