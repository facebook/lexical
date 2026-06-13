/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {LexicalHTMLElement} from '../../../types';
import {isLexicalNode} from '../../../utils/isLexicalNode';

// Descend into open shadow roots so editors mounted inside web components or
// shadow trees are discoverable. querySelectorAll does not pierce shadow
// boundaries on its own.
function collectFromRoot(root: Document | ShadowRoot, out: Element[]): void {
  for (const el of root.querySelectorAll('div[data-lexical-editor]')) {
    out.push(el);
  }
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot !== null) {
      collectFromRoot(el.shadowRoot, out);
    }
  }
}

export default function queryLexicalNodes(): LexicalHTMLElement[] {
  const out: Element[] = [];
  collectFromRoot(document, out);
  return out.filter(isLexicalNode);
}
