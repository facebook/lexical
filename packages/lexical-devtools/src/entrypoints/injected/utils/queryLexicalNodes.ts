/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {querySelectorAllDeep} from 'lexical';

import {LexicalHTMLElement} from '../../../types';
import {isLexicalNode} from '../../../utils/isLexicalNode';

export default function queryLexicalNodes(): LexicalHTMLElement[] {
  const out: Element[] = [];
  for (const el of querySelectorAllDeep(document, 'div[data-lexical-editor]')) {
    out.push(el);
  }
  return out.filter(isLexicalNode);
}
