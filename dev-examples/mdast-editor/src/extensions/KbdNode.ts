/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $create,
  $getDocument,
  type DOMExportOutput,
  ElementNode,
  type LexicalNode,
} from 'lexical';

/**
 * The second example custom construct: a keyboard key, GitHub's classic
 * inline-HTML idiom (`press <kbd>Ctrl</kbd>+<kbd>C</kbd>`). Where the
 * collapsible demonstrates the raw HTML *block* path, this node
 * demonstrates the *inline* path: a `<kbd>` run inside a paragraph maps to
 * an inline ElementNode, and Markdown between the raw tags
 * (`<kbd>**Ctrl**</kbd>`) still parses because micromark tokenizes
 * phrasing-level HTML tag by tag. See `MdastKbdExtension` for the wiring.
 */
export class KbdNode extends ElementNode {
  $config() {
    return this.config('kbd', {extends: ElementNode});
  }

  isInline(): true {
    return true;
  }

  // An empty keycap has no width to click into; let normal editing
  // remove the node once its last character is deleted.
  canBeEmpty(): false {
    return false;
  }

  createDOM(): HTMLElement {
    // $getDocument, not the global document: the editor's root may live in
    // a Shadow DOM or another realm (iframe).
    const dom = $getDocument().createElement('kbd');
    dom.className = 'kbd-key';
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  // The clipboard/Markdown encoding is the bare tag; the keycap look is
  // the editor theme's, not the document's.
  exportDOM(): DOMExportOutput {
    return {element: $getDocument().createElement('kbd')};
  }
}

export function $createKbdNode(): KbdNode {
  return $create(KbdNode);
}

export function $isKbdNode(
  node: LexicalNode | null | undefined,
): node is KbdNode {
  return node instanceof KbdNode;
}
