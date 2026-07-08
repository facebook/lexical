/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$appendNodeToHTML} from '@lexical/html';
import {
  $create,
  $createParagraphNode,
  $getSlot,
  $getSlotNames,
  $setSlot,
  type DOMExportOutput,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';

// The Card is an ElementNode host that demonstrates the dual capability of
// hosting both a named slot (`title`, exactly one block) and regular
// children (the body, zero or more blocks). The reconciler renders the named
// slot ahead of the children, so the DOM order is `<title>` then the body
// blocks, no React chrome required. The title is a single-line field, so its
// slot value is a bare ParagraphNode — the slot link itself is the virtual
// shadow root, no container wrapper needed; Enter inside it is a core no-op
// and multi-block paste flattens to inline content like an <input>.
export class CardNode extends ElementNode {
  $config() {
    return this.config('card', {extends: ElementNode, slots: ['title']});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-card-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  // The Card is a shadow-root container so block-level inserts driven by
  // `$insertNodeToNearestRoot` (e.g. INSERT_TABLE_COMMAND, the Markdown
  // shortcut paragraph→heading transform) land inside the body channel
  // instead of splitting the Card and dropping the new block at the
  // document root. SELECT_ALL inside the title slot still scopes to the
  // (inner) slot value since its slot link is a virtual shadow root and
  // resolution picks the innermost boundary.
  isShadowRoot(): true {
    return true;
  }

  // Slots ride in a separate Map, so the HTML exporter never descends into
  // them on its own — like NodeState, slot serialization is opt-in. Emit the
  // named title slot into a `data-lexical-slot` wrapper that the
  // PlaygroundImportExtension's CardImportRule maps back to $setSlot(); the
  // body is regular children and serializes through the normal child path
  // (the outer $appendNodesToHTML loop recurses into `target.getChildren()`
  // when no `$getChildNodes` override is supplied).
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'lexical-card-node';
    for (const name of $getSlotNames(this)) {
      const slot = $getSlot(this, name);
      if (slot) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-lexical-slot', name);
        $appendNodeToHTML(editor, slot, wrapper);
        element.append(wrapper);
      }
    }
    return {element};
  }
}

export function $createCardNode(): CardNode {
  const node = $create(CardNode);
  // Both fields start empty; the "Title" / "Body" hints are CSS placeholders
  // (see PlaygroundEditorTheme.css) shown while the field holds only the
  // empty-paragraph <br>, so the model carries no seeded placeholder text.
  $setSlot(node, 'title', $createParagraphNode());
  node.append($createParagraphNode());
  return node;
}

export function $isCardNode(
  node: LexicalNode | null | undefined,
): node is CardNode {
  return node instanceof CardNode;
}
