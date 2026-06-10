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
} from '@lexical/html';
import {
  $createNodeSelection,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $selectAll,
  $setSelection,
  CLICK_COMMAND,
  defineExtension,
  KEY_TAB_COMMAND,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {$createCardNode, $isCardNode, CardNode} from '../../src/nodes/CardNode';
import {PlaygroundRichTextImportExtension} from '../../src/nodes/PlaygroundImportExtension';
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

// Adds the DOM import pipeline: PlaygroundRichTextImportExtension supplies
// the Card / Figure rules AND the `$rewrapOrphanedSlotWrappers` preprocess
// that re-assembles slot wrappers stripped from external paste.
const CardImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [
    CardExtension,
    CoreImportExtension,
    PlaygroundRichTextImportExtension,
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
      // CardNode.exportDOM manually appends body children; if the outer
      // $appendNodesToHTML loop also recurses through `target.getChildren()`
      // (the default when no `$getChildNodes` is supplied), every body
      // paragraph is emitted twice and re-import doubles `Body`.
      expect(card.getChildrenSize()).toBe(1);
    });
  });

  // CardNode.includeChildrenWhenSelected() opts in so the body rides along
  // when the whole card is promoted to a NodeSelection. The clipboard JSON
  // path already honors the opt-in; HTML export must too — both formats are
  // written to the clipboard, and external paste targets pick text/html.
  it('keeps the body in HTML export when the Card is in a NodeSelection', () => {
    using editor = buildEditorFromExtensions(CardImportTestExtension);

    let html = '';
    editor.update(
      () => {
        const card = $createCardNode();
        $getRoot().clear().append(card);
        const selection = $createNodeSelection();
        selection.add(card.getKey());
        $setSelection(selection);
        html = $generateHtmlFromNodes(editor, selection);
      },
      {discrete: true},
    );

    expect(html).toContain('Title');
    // Body lives outside the selection (only the Card key was added). Without
    // honoring includeChildrenWhenSelected(), the recursion forwards the
    // NodeSelection into each body child, none are selected, and the body
    // text never reaches the HTML.
    expect(html).toContain('Body');
  });

  // External paste path: a browser's contenteditable Cmd+A → Cmd+C strips
  // the outer `<div class="lexical-card-node">` wrapper that the Card's
  // exportDOM emits, leaving the title slot wrapper and the body paragraphs
  // as fragment-root siblings. `$rewrapOrphanedSlotWrappers` rebuilds the
  // host before the import walk so the body content stays attached to the
  // Card instead of promoting to root-level paragraphs.
  it('rewraps an orphaned Card slot wrapper without losing the body siblings', () => {
    using editor = buildEditorFromExtensions(CardImportTestExtension);

    const orphanedHtml =
      '<div data-lexical-slot="title"><p>Title</p></div>' + '<p>Body</p>';

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(orphanedHtml, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      // Without the rewrap, the body promotes to a root paragraph and the
      // Card lands bodiless; with it, the Card keeps both slot and body.
      expect($getRoot().getChildrenSize()).toBe(1);
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'Top-level node must be a CardNode');
      expect($getSlot(card, 'title')?.getTextContent()).toBe('Title');
      expect(card.getChildrenSize()).toBe(1);
      expect(card.getChildren()[0]?.getTextContent()).toBe('Body');
    });
  });

  // Two-Card external paste: rewrap must split adjacent same-name orphan
  // wrappers into per-host runs. Folding both title wrappers into a single
  // synthetic Card div makes CardImportRule call `$setSlot(card, 'title')`
  // twice — the second call detaches the first title silently, so the
  // first Card's content is lost without warning.
  it('rewraps two orphaned Card runs into two distinct CardNodes', () => {
    using editor = buildEditorFromExtensions(CardImportTestExtension);

    const orphanedHtml =
      '<div data-lexical-slot="title"><p>First Title</p></div>' +
      '<p>First Body</p>' +
      '<div data-lexical-slot="title"><p>Second Title</p></div>' +
      '<p>Second Body</p>';

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(orphanedHtml, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const cards = $getRoot()
        .getChildren()
        .filter(child => $isCardNode(child));
      expect(cards).toHaveLength(2);
      expect($getSlot(cards[0], 'title')?.getTextContent()).toBe('First Title');
      expect(cards[0].getChildren()[0]?.getTextContent()).toBe('First Body');
      expect($getSlot(cards[1], 'title')?.getTextContent()).toBe(
        'Second Title',
      );
      expect(cards[1].getChildren()[0]?.getTextContent()).toBe('Second Body');
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

  // The Tab handler is the first real consumer of $getSlotNameWithinHost —
  // it walks the caret's ancestors to determine whether the caret sits in
  // the title slot or in the body children, and picks the destination
  // accordingly. These two cases pin both directions.
  it('Tab from the title slot moves the caret into the body', () => {
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
        const titleSlot = $getSlot(card, 'title');
        assert($isElementNode(titleSlot), 'title slot must be an element');
        const titlePara = titleSlot.getFirstChild();
        assert($isElementNode(titlePara), 'title slot must hold a paragraph');
        titlePara.selectEnd();
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_TAB_COMMAND,
      new KeyboardEvent('keydown', {key: 'Tab'}),
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'CardNode must survive Tab');
      const bodyFirst = card.getChildren()[0];
      assert($isElementNode(bodyFirst), 'Body must hold a paragraph after Tab');
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Tab must leave a RangeSelection');
      // Caret landed inside the body's first paragraph.
      expect(bodyFirst.isParentOf(selection.anchor.getNode())).toBe(true);
    });
  });

  it('Shift+Tab from the body moves the caret into the title slot', () => {
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
        const bodyFirst = card.getChildren()[0];
        assert($isElementNode(bodyFirst), 'Body must hold a paragraph');
        bodyFirst.selectStart();
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_TAB_COMMAND,
      new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true}),
    );

    editor.read(() => {
      const card = $getRoot().getFirstChild();
      assert($isCardNode(card), 'CardNode must survive Shift+Tab');
      const titleSlot = $getSlot(card, 'title');
      assert($isElementNode(titleSlot), 'title slot must be an element');
      const selection = $getSelection();
      assert($isRangeSelection(selection), 'Shift+Tab must leave a selection');
      // Caret landed inside the title slot.
      expect(titleSlot.isParentOf(selection.anchor.getNode())).toBe(true);
    });
  });

  // The reconciler mounts each slot inside a `<div data-lexical-slot="...">`
  // scaffold wrapper that carries no `__lexicalKey_*`. The playground CSS gives
  // that wrapper a padding / border / ::before "TITLE" label, so any click on
  // the visible label or the surrounding padding lands on the keyless wrapper.
  // `$getNearestNodeFromDOMNode` then walks past it to the CardNode, and the
  // CLICK_COMMAND promoted the click to a whole-Card NodeSelection — exactly
  // the case `$resolveCardChromeTarget` was supposed to skip.
  it('clicking the title slot wrapper does not promote to a whole-Card NodeSelection', () => {
    using editor = buildEditorFromExtensions(CardTestExtension);
    const container = document.createElement('div');
    document.body.appendChild(container);
    editor.setRootElement(container);

    editor.update(
      () => {
        $getRoot().clear().append($createCardNode());
      },
      {discrete: true},
    );

    const wrapper = container.querySelector('[data-lexical-slot="title"]');
    assert(
      wrapper instanceof HTMLElement,
      'Reconciler must have mounted the title slot scaffold wrapper',
    );

    const event = new MouseEvent('click', {bubbles: true, cancelable: true});
    Object.defineProperty(event, 'target', {value: wrapper});
    editor.dispatchCommand(CLICK_COMMAND, event);

    editor.read(() => {
      const selection = $getSelection();
      // Without the slot-wrapper guard, this is a NodeSelection containing
      // the Card key. With the guard, the click falls through and the
      // selection stays whatever the caller set (here, null since the
      // Card was just inserted without a starting selection).
      expect($isNodeSelection(selection)).toBe(false);
    });

    container.remove();
  });
});
