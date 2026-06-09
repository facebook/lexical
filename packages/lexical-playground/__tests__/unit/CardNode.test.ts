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
} from '@lexical/clipboard';
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $generateHtmlFromNodes,
  $generateNodesFromDOMViaExtension,
  CoreImportExtension,
  DOMImportExtension,
} from '@lexical/html';
import {
  $createNodeSelection,
  $getRoot,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $selectAll,
  $setSelection,
  configExtension,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {$createCardNode, $isCardNode, CardNode} from '../../src/nodes/CardNode';
import {PlaygroundRichTextImportRules} from '../../src/nodes/PlaygroundImportExtension';
import {
  $isSlotContainerNode,
  SlotContainerNode,
} from '../../src/nodes/SlotContainerNode';
import {CardExtension} from '../../src/plugins/CardExtension';

const CardTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [CardExtension],
  name: '[test-card]',
  nodes: [CardNode, SlotContainerNode],
});

// Adds the DOM import pipeline: CoreImportExtension imports the paragraphs
// inside each slot wrapper; the card rule (PlaygroundRichTextImportRules)
// rebuilds the host and re-attaches slots via setSlot.
const CardImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [
    CardExtension,
    CoreImportExtension,
    configExtension(DOMImportExtension, {rules: PlaygroundRichTextImportRules}),
  ],
  name: '[test-card-import]',
  nodes: [CardNode, SlotContainerNode],
});

describe('CardNode named slots', () => {
  it('round-trips the title slot and body children through clipboard copy -> paste', () => {
    using editor = buildEditorFromExtensions(CardTestExtension);

    let exported: ReturnType<typeof $generateJSONFromSelectedNodes>;
    editor.update(
      () => {
        const card = $createCardNode();
        $getRoot().clear().append(card);
        const selection = $createNodeSelection();
        selection.add(card.getKey());
        $setSelection(selection);
        exported = $generateJSONFromSelectedNodes(editor, selection);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $getRoot().clear();
        const nodes = $generateNodesFromSerializedNodes(exported.nodes);
        $getRoot().append(...nodes);
      },
      {discrete: true},
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'Pasted top-level node must be a CardNode');
      // Only `title` is a named slot; the body is regular children that go
      // through the normal child channel.
      expect($getSlotNames(card)).toEqual(['title']);
      expect($getSlot(card, 'title')?.getTextContent()).toBe('Title');
      expect(card.getChildren()[0]?.getTextContent()).toBe('Body');
    });
  });

  it('round-trips the title slot and body children through HTML export -> DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(CardImportTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createCardNode());
      },
      {discrete: true},
    );
    const html = editor.read(() => $generateHtmlFromNodes(editor, null));

    // The title slot rides in its own named wrapper; the body is regular
    // ElementNode children, so its paragraph serializes through the normal
    // child path with no slot wrapper.
    expect(html).toContain('data-lexical-slot="title"');
    expect(html).not.toContain('data-lexical-slot="body"');

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(html, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'Imported top-level node must be a CardNode');
      expect($getSlotNames(card)).toEqual(['title']);
      expect($getSlot(card, 'title')?.getTextContent()).toBe('Title');
      expect(card.getChildren()[0]?.getTextContent()).toBe('Body');
    });
  });

  it('wraps the title slot value in a shadow-root SlotContainerNode', () => {
    using editor = buildEditorFromExtensions(CardTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createCardNode());
      },
      {discrete: true},
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'Top-level node must be a CardNode');
      const slot = $getSlot(card, 'title');
      assert(
        $isSlotContainerNode(slot),
        'Title slot value must be a SlotContainerNode',
      );
      // The container is a shadow root: SELECT_ALL / collapseAtStart scope
      // to its contents instead of escaping into the host document.
      expect(slot.isShadowRoot()).toBe(true);
      const inner = slot.getFirstChild();
      assert($isElementNode(inner), 'Title slot must hold a paragraph');
      // getTopLevelElement of the inner paragraph stops at the container
      // boundary rather than walking to the editor root.
      expect(inner.getTopLevelElement()).toBe(inner);
    });
  });

  it('SELECT_ALL inside a slot scopes to the slot container, not the root', () => {
    using editor = buildEditorFromExtensions(CardTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createCardNode());
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const card = $getRoot().getFirstChild();
        assert($isCardNode(card), 'Top-level node must be a CardNode');
        const slot = $getSlot(card, 'title');
        assert($isSlotContainerNode(slot), 'title slot must be a container');
        const paragraph = slot.getFirstChild();
        assert($isElementNode(paragraph), 'slot must hold a paragraph');
        // Caret inside the slot, then SELECT_ALL with the current selection
        // (mirrors the rich-text SELECT_ALL handler passing the selection).
        const selection = paragraph.selectStart();
        const result = $selectAll(selection);
        // Scoped to the container: both ends stay inside the slot and the
        // selected text is just the title, never the body or root content.
        expect(slot.isParentOf(result.anchor.getNode())).toBe(true);
        expect(slot.isParentOf(result.focus.getNode())).toBe(true);
        expect(result.getTextContent()).toBe('Title');
      },
      {discrete: true},
    );
  });

  // Backspace at the start of a non-empty slot paragraph falls through
  // deleteCharacter to $collapseAtStart, which walks parents until an
  // ElementNode returns true. jsdom doesn't implement Selection.modify (the
  // step deleteCharacter takes first), so — like the HeadingNode suite — we
  // exercise the collapseAtStart building blocks directly and leave the full
  // Backspace to e2e.
  it('Backspace at slot start is a no-op via the shadow-root container', () => {
    using editor = buildEditorFromExtensions(CardTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createCardNode());
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const card = $getRoot().getFirstChild();
        assert($isCardNode(card), 'Top-level node must be a CardNode');
        const slot = $getSlot(card, 'title');
        assert($isSlotContainerNode(slot), 'title slot must be a container');
        const paragraph = slot.getFirstChild();
        assert($isElementNode(paragraph), 'slot must hold a paragraph');
        const selection = paragraph.selectStart();
        // The non-empty paragraph defers (returns false), so the
        // $collapseAtStart walk continues up to the container.
        expect(paragraph.collapseAtStart(selection)).toBe(false);
        // The container terminates the walk with a no-op true: the deletion
        // bails instead of merging the paragraph into the host.
        expect(slot.collapseAtStart()).toBe(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'Card must survive backspace at slot start');
      expect($getSlot(card, 'title')?.getTextContent()).toBe('Title');
      expect(card.getChildren()[0]?.getTextContent()).toBe('Body');
      // Nothing escaped into the root: the card is still the only child.
      expect($getRoot().getChildrenSize()).toBe(1);
    });
  });
});
