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
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $setSelection,
  defineExtension,
} from 'lexical';
import {assert, describe, expect, it} from 'vitest';

import {PlaygroundRichTextImportExtension} from '../../src/nodes/PlaygroundImportExtension';
import {
  $createPullQuoteNode,
  $isPullQuoteNode,
  PullQuoteNode,
} from '../../src/nodes/PullQuoteNode';
import {SlotContainerNode} from '../../src/nodes/SlotContainerNode';
import {PullQuoteExtension} from '../../src/plugins/PullQuoteExtension';

const PullQuoteTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [PullQuoteExtension],
  name: '[test-pullquote]',
  nodes: [PullQuoteNode, SlotContainerNode],
});

// Adds the DOM import pipeline so HTML round-trip exercises the full
// PullQuoteImportRule + `$rewrapOrphanedSlotWrappers` preprocess.
const PullQuoteImportTestExtension = defineExtension({
  $initialEditorState: null,
  dependencies: [
    PullQuoteExtension,
    CoreImportExtension,
    PlaygroundRichTextImportExtension,
  ],
  name: '[test-pullquote-import]',
  nodes: [PullQuoteNode, SlotContainerNode],
});

describe('PullQuoteNode atomic decorator host', () => {
  it('holds two editable shadow-root slots: quote and attribution', () => {
    using editor = buildEditorFromExtensions(PullQuoteTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createPullQuoteNode());
      },
      {discrete: true},
    );

    editor.read(() => {
      const pullquote = $getRoot().getFirstChild();
      assert(
        $isPullQuoteNode(pullquote),
        'Top-level node must be a PullQuoteNode',
      );
      expect($getSlotNames(pullquote)).toEqual(['quote', 'attribution']);

      const quote = $getSlot(pullquote, 'quote');
      assert(
        quote instanceof SlotContainerNode,
        'quote slot must be a SlotContainerNode',
      );
      expect(quote.isShadowRoot()).toBe(true);

      const attribution = $getSlot(pullquote, 'attribution');
      assert(
        attribution instanceof SlotContainerNode,
        'attribution slot must be a SlotContainerNode',
      );
      expect(attribution.isShadowRoot()).toBe(true);
    });
  });

  it('links both slot values to the host without making them children', () => {
    using editor = buildEditorFromExtensions(PullQuoteTestExtension);

    editor.update(
      () => {
        $getRoot().clear().append($createPullQuoteNode());
      },
      {discrete: true},
    );

    editor.read(() => {
      const pullquote = $getRoot().getFirstChild();
      assert($isPullQuoteNode(pullquote), 'host must be a PullQuoteNode');
      for (const name of $getSlotNames(pullquote)) {
        const value = $getSlot(pullquote, name);
        assert(value !== null, `slot ${name} must have a value`);
        // Slot invariant: parent === null and slotHost === pullquote, so
        // the value never appears in the host's child list. The host is a
        // DecoratorNode (no children channel), so this is enforced
        // structurally too.
        expect(value.getParent()).toBe(null);
        expect($getSlotHost(value)).toBe(pullquote);
      }
    });
  });

  it('round-trips both slots through clipboard copy -> paste', () => {
    using editor = buildEditorFromExtensions(PullQuoteTestExtension);

    let exported: ReturnType<typeof $generateJSONFromSelectedNodes>;
    editor.update(
      () => {
        const pullquote = $createPullQuoteNode();
        $getRoot().clear().append(pullquote);
        const selection = $createNodeSelection();
        selection.add(pullquote.getKey());
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
      const pullquote = $getRoot().getFirstChild();
      assert(
        $isPullQuoteNode(pullquote),
        'Pasted top-level node must be a PullQuoteNode',
      );
      expect($getSlotNames(pullquote)).toEqual(['quote', 'attribution']);
      const quote = $getSlot(pullquote, 'quote');
      assert(quote instanceof SlotContainerNode, 'quote slot preserved');
      const attribution = $getSlot(pullquote, 'attribution');
      assert(
        attribution instanceof SlotContainerNode,
        'attribution slot preserved',
      );
      // Default seed text rides through JSON round-trip intact.
      expect(quote.getTextContent()).toContain('discover the limits');
      expect(attribution.getTextContent()).toBe('Arthur C. Clarke');
    });
  });

  it('round-trips through HTML export -> DOMImportExtension', () => {
    using editor = buildEditorFromExtensions(PullQuoteImportTestExtension);

    editor.update(
      () => {
        const pullquote = $createPullQuoteNode();
        $getRoot().clear().append(pullquote);
        // Mutate both slots away from the default seed so the round-trip
        // assertion actually validates the import path (if the import
        // silently fell back to the seed, these assertions would fail).
        const quote = $getSlot(pullquote, 'quote');
        assert(quote instanceof SlotContainerNode, 'quote seed exists');
        quote
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('CUSTOM QUOTE')),
          );
        const attribution = $getSlot(pullquote, 'attribution');
        assert(
          attribution instanceof SlotContainerNode,
          'attribution seed exists',
        );
        attribution
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('CUSTOM AUTHOR')),
          );
      },
      {discrete: true},
    );
    const html = editor.read(() => $generateHtmlFromNodes(editor, null));

    expect(html).toContain('lexical-pullquote-node');
    expect(html).toContain('data-lexical-slot="quote"');
    expect(html).toContain('data-lexical-slot="attribution"');

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(html, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const pullquote = $getRoot().getFirstChild();
      assert(
        $isPullQuoteNode(pullquote),
        'Imported top-level node must be a PullQuoteNode',
      );
      const quote = $getSlot(pullquote, 'quote');
      assert(quote instanceof SlotContainerNode, 'quote slot rebuilt');
      const attribution = $getSlot(pullquote, 'attribution');
      assert(
        attribution instanceof SlotContainerNode,
        'attribution slot rebuilt',
      );
      expect(quote.getTextContent()).toBe('CUSTOM QUOTE');
      expect(attribution.getTextContent()).toBe('CUSTOM AUTHOR');
    });
  });

  // Missing-slot HTML must NOT inherit the default seed text from
  // `$createPullQuoteNode`. The import rule clears both slots before walking
  // the HTML, so a fragment that only carries `quote` arrives with an empty
  // attribution slot, not "Arthur C. Clarke" silently fabricated.
  it('does not leak default seed into missing slots on import', () => {
    using editor = buildEditorFromExtensions(PullQuoteImportTestExtension);

    const onlyQuoteHtml =
      '<div class="lexical-pullquote-node">' +
      '<div data-lexical-slot="quote"><p>Only the quote</p></div>' +
      '</div>';

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(onlyQuoteHtml, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const pullquote = $getRoot().getFirstChild();
      assert($isPullQuoteNode(pullquote), 'host imported');
      const quote = $getSlot(pullquote, 'quote');
      assert(quote instanceof SlotContainerNode, 'quote slot rebuilt');
      expect(quote.getTextContent()).toBe('Only the quote');
      // The attribution slot was not present in HTML — it must be absent,
      // not silently populated with the seed default.
      expect($getSlot(pullquote, 'attribution')).toBe(null);
    });
  });

  // External paste: a browser's contenteditable Cmd+A → Cmd+C strips the
  // outer `<div class="lexical-pullquote-node">` wrapper, leaving the
  // quote / attribution slot wrappers as fragment-root siblings.
  // `$rewrapOrphanedSlotWrappers` reassembles them under a synthetic
  // `<div class="lexical-pullquote-node">` so the import rule matches.
  it('rewraps orphaned quote+attribution wrappers into a PullQuoteNode', () => {
    using editor = buildEditorFromExtensions(PullQuoteImportTestExtension);

    const orphanedHtml =
      '<div data-lexical-slot="quote"><p>Quoted</p></div>' +
      '<div data-lexical-slot="attribution"><p>Author</p></div>';

    editor.update(
      () => {
        $getRoot().clear().select();
        const dom = new DOMParser().parseFromString(orphanedHtml, 'text/html');
        $getRoot().append(...$generateNodesFromDOMViaExtension(dom));
      },
      {discrete: true},
    );

    editor.read(() => {
      const pullquote = $getRoot().getFirstChild();
      assert(
        $isPullQuoteNode(pullquote),
        'Reassembled top-level node must be a PullQuoteNode',
      );
      const quote = $getSlot(pullquote, 'quote');
      assert(quote instanceof SlotContainerNode, 'quote slot rebuilt');
      const attribution = $getSlot(pullquote, 'attribution');
      assert(
        attribution instanceof SlotContainerNode,
        'attribution slot rebuilt',
      );
      expect(quote.getTextContent()).toBe('Quoted');
      expect(attribution.getTextContent()).toBe('Author');
    });
  });
});
