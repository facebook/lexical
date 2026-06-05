/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateJSONFromSelectedNodes} from '@lexical/clipboard';
import {createHeadlessEditor} from '@lexical/headless';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $setSelection,
  ElementNode,
  type SerializedElementNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// A shadow-root slot value that also excludes itself from copy — an
// unsupported combination the export guard must reject loudly instead of
// emitting a dangling slot entry that breaks on paste.
class ExcludedShadowRootNode extends ElementNode {
  static getType(): string {
    return 'excluded_shadow_root';
  }
  static clone(node: ExcludedShadowRootNode): ExcludedShadowRootNode {
    return new ExcludedShadowRootNode(node.__key);
  }
  static importJSON(
    serializedNode: SerializedElementNode,
  ): ExcludedShadowRootNode {
    return $createExcludedShadowRootNode().updateFromJSON(serializedNode);
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
  isShadowRoot(): boolean {
    return true;
  }
  excludeFromCopy(): boolean {
    return true;
  }
}

function $createExcludedShadowRootNode(): ExcludedShadowRootNode {
  return new ExcludedShadowRootNode();
}

describe('slot clipboard export', () => {
  test('throws when a slot value is excluded from copy', () => {
    const editor = createHeadlessEditor({
      namespace: 'slot-exclude',
      nodes: [ExcludedShadowRootNode],
    });
    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        host.setSlot('title', $createExcludedShadowRootNode());
      },
      {discrete: true},
    );
    editor.read(() => {
      expect(() => $generateJSONFromSelectedNodes(editor, null)).toThrow(
        /did not serialize to a single node/,
      );
    });
  });

  test('a host outside the selection does not gate the export on its slot', () => {
    const editor = createHeadlessEditor({
      namespace: 'slot-exclude',
      nodes: [ExcludedShadowRootNode],
    });
    let beforeKey = '';
    editor.update(
      () => {
        const before = $createTextNode('BEFORE');
        $getRoot().append($createParagraphNode().append(before));
        const host = $createParagraphNode();
        host.append($createTextNode('CHILD'));
        host.setSlot('title', $createExcludedShadowRootNode());
        $getRoot().append(host);
        beforeKey = before.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const sel = $createRangeSelection();
        sel.anchor.set(beforeKey, 0, 'text');
        sel.focus.set(beforeKey, 6, 'text');
        $setSelection(sel);
      },
      {discrete: true},
    );
    editor.read(() => {
      // The selection covers only "BEFORE"; the slot-bearing host is outside
      // it, so its excluded slot must not be reached and must not throw.
      expect(() =>
        $generateJSONFromSelectedNodes(editor, $getSelection()),
      ).not.toThrow();
    });
  });
});
