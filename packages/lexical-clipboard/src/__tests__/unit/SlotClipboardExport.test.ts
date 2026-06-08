/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
  $insertGeneratedNodes,
} from '@lexical/clipboard';
import {createHeadlessEditor} from '@lexical/headless';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotNames,
  $setSlot,
  ElementNode,
  type SerializedElementNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

// A plain shadow-root ElementNode used as a slot value for the positive
// round-trip test. Mirrors the production playground's slot-value shape
// (shadow-root container holding regular block content) without the
// excludeFromCopy override that ExcludedShadowRootNode adds.
class PlainShadowRootNode extends ElementNode {
  static getType(): string {
    return 'plain_shadow_root';
  }
  static clone(node: PlainShadowRootNode): PlainShadowRootNode {
    return new PlainShadowRootNode(node.__key);
  }
  static importJSON(
    serializedNode: SerializedElementNode,
  ): PlainShadowRootNode {
    return $createPlainShadowRootNode().updateFromJSON(serializedNode);
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
}

function $createPlainShadowRootNode(): PlainShadowRootNode {
  return new PlainShadowRootNode();
}

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
        $setSlot(host, 'title', $createExcludedShadowRootNode());
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
        $setSlot(host, 'title', $createExcludedShadowRootNode());
        $getRoot().append(host);
        beforeKey = before.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        $getNodeByKey<TextNode>(beforeKey)!.select(0, 6);
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

  // Positive round-trip: a slot-bearing host (host + named slot whose value is
  // a shadow-root ElementNode holding regular content) serializes through
  // $generateJSONFromSelectedNodes and restores via
  // $generateNodesFromSerializedNodes + $insertGeneratedNodes with the slot
  // name and slot subtree text preserved.
  test('a slot-bearing host round-trips through JSON copy + insert', () => {
    const editor = createHeadlessEditor({
      namespace: 'slot-roundtrip',
      nodes: [PlainShadowRootNode],
    });
    editor.update(
      () => {
        const host = $createParagraphNode();
        host.append($createTextNode('HostChild'));
        const slot = $createPlainShadowRootNode();
        slot.append($createParagraphNode().append($createTextNode('SlotText')));
        $getRoot().append(host);
        $setSlot(host, 'media', slot);
      },
      {discrete: true},
    );

    // Copy: null selection → whole tree.
    let serialized: ReturnType<typeof $generateJSONFromSelectedNodes>;
    editor.read(() => {
      serialized = $generateJSONFromSelectedNodes(editor, null);
    });
    expect(serialized!.nodes).toHaveLength(1);
    const hostJson = serialized!.nodes[0] as SerializedElementNode & {
      slots?: Record<string, SerializedElementNode>;
    };
    expect(hostJson.slots).toBeDefined();
    expect(hostJson.slots!.media).toBeDefined();

    // Paste into a fresh editor and verify the slot survived.
    const editor2 = createHeadlessEditor({
      namespace: 'slot-roundtrip',
      nodes: [PlainShadowRootNode],
    });
    editor2.update(
      () => {
        const target = $createParagraphNode();
        $getRoot().append(target);
        target.selectStart();
        const nodes = $generateNodesFromSerializedNodes(serialized!.nodes);
        $insertGeneratedNodes(editor2, nodes, $getSelection()!);
      },
      {discrete: true},
    );

    editor2.read(() => {
      const inserted = $getRoot()
        .getChildren()
        .find(n => $getSlotNames(n).length > 0);
      expect(inserted).toBeDefined();
      expect($getSlotNames(inserted!)).toEqual(['media']);
      const slot = $getSlot(inserted!, 'media');
      expect(slot).not.toBeNull();
      expect(slot!.getTextContent()).toContain('SlotText');
    });
  });
});
