/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  ArtificialNode__DO_NOT_USE,
  isDOMDocumentNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

import {$createNodesFromDOM} from './$createNodesFromDOM';
import {$unwrapArtificialNodes} from './$unwrapArtificialNodes';
import {IGNORE_TAGS} from './constants';

/**
 * How you parse your html string to get a document is left up to you. In the browser you can use the native
 * DOMParser API to generate a document (see clipboard.ts), but to use in a headless environment you can use JSDom
 * or an equivalent library and pass in the document here.
 */

export function $generateNodesFromDOM(
  editor: LexicalEditor,
  dom: Document | ParentNode,
): Array<LexicalNode> {
  const elements = isDOMDocumentNode(dom)
    ? dom.body.childNodes
    : dom.childNodes;
  let lexicalNodes: Array<LexicalNode> = [];
  const allArtificialNodes: Array<ArtificialNode__DO_NOT_USE> = [];
  for (const element of elements) {
    if (!IGNORE_TAGS.has(element.nodeName)) {
      const lexicalNode = $createNodesFromDOM(
        element,
        editor,
        allArtificialNodes,
        false,
      );
      if (lexicalNode !== null) {
        lexicalNodes = lexicalNodes.concat(lexicalNode);
      }
    }
  }
  $unwrapArtificialNodes(allArtificialNodes);

  return lexicalNodes;
}
