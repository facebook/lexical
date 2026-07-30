/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $create,
  type DOMExportOutput,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

// A generic editable slot value. It is a shadow root (like a table cell), so a
// RangeSelection and SELECT_ALL stay scoped to its contents and Backspace at
// the start is a no-op instead of escaping into the host.
export class SlotContainerNode extends ElementNode {
  $config() {
    return this.config('slot-container', {extends: ElementNode});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-slot-container';
    return div;
  }

  // Export as a fragment since it "is" the slot wrapper created by the host
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    return {element: document.createDocumentFragment()};
  }

  updateDOM(): false {
    return false;
  }

  isShadowRoot(): boolean {
    return true;
  }

  collapseAtStart(): true {
    return true;
  }
}

export function $createSlotContainerNode(): SlotContainerNode {
  return $create(SlotContainerNode);
}

export function $isSlotContainerNode(
  node: LexicalNode | null | undefined,
): node is SlotContainerNode {
  return node instanceof SlotContainerNode;
}
