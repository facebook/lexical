/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSlotHost,
  $isRangeSelection,
  $isTextNode,
  $selectAll,
  $setSelection,
  $setSlot,
  defineExtension,
  getDOMSelection,
  type LexicalNode,
} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';

import {$internalCreateRangeSelection} from '../../LexicalSelection';
import {
  $assertNodeType,
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from '../utils';

// Walk up via getParent() to the innermost slot-root ancestor (a node that
// reports a slot host), mirroring the production $getPointSlotFrame. Returns
// the slot root's key, or null when the node is not inside any slot.
function $slotFrameKeyOf(node: LexicalNode): string | null {
  let current: LexicalNode | null = node;
  while (current !== null) {
    if ($getSlotHost(current) !== null) {
      return current.getKey();
    }
    current = current.getParent();
  }
  return null;
}

describe('named-slots: selection containment (slot isolation)', () => {
  const mountedRoots: HTMLElement[] = [];
  afterEach(() => {
    while (mountedRoots.length > 0) {
      const node = mountedRoots.pop();
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  });

  function mountRoot(editor: LexicalEditorWithDispose) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountedRoots.push(root);
    editor.setRootElement(root);
    return root;
  }

  // host -> slot 'title' ("Title") + linked-list child body ("Body")
  const keys: Record<string, string> = {};
  function buildSlotEditor() {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const host = $createParagraphNode();
          const title = $createTestShadowRootNode();
          const titlePara = $createParagraphNode();
          const titleText = $createTextNode('Title');
          titlePara.append(titleText);
          title.append(titlePara);
          const subtitle = $createTestShadowRootNode();
          const subtitlePara = $createParagraphNode();
          const subtitleText = $createTextNode('Subtitle');
          subtitlePara.append(subtitleText);
          subtitle.append(subtitlePara);
          const body = $createParagraphNode();
          const bodyText = $createTextNode('Body');
          body.append(bodyText);
          $getRoot().clear().append(host);
          host.append(body);
          $setSlot(host, 'title', title);
          $setSlot(host, 'subtitle', subtitle);
          keys.host = host.getKey();
          keys.title = title.getKey();
          keys.titleText = titleText.getKey();
          keys.subtitle = subtitle.getKey();
          keys.subtitleText = subtitleText.getKey();
          keys.body = body.getKey();
          keys.bodyText = bodyText.getKey();
        },
        name: '[slot-selection-poc]',
        nodes: [TestShadowRootNode],
      }),
    );
    mountRoot(editor);
    return editor;
  }

  function domTextNodeOf(editor: LexicalEditorWithDispose, key: string): Node {
    const el = editor.getElementByKey(key);
    assert(el !== null);
    const textNode = el.firstChild;
    assert(textNode !== null);
    return textNode;
  }

  test('anchor in a slot, focus dragged into the body, clamps focus into the slot', () => {
    using editor = buildSlotEditor();

    const titleTextDOM = domTextNodeOf(editor, keys.titleText);
    const bodyTextDOM = domTextNodeOf(editor, keys.bodyText);

    const domSelection = getDOMSelection(editor._window ?? window);
    const range = document.createRange();
    range.setStart(titleTextDOM, 2);
    range.setEnd(bodyTextDOM, 2);
    domSelection?.removeAllRanges();
    domSelection?.addRange(range);

    editor.update(
      () => {
        const selection = $internalCreateRangeSelection(
          $getSelection(),
          domSelection,
          editor,
          {type: 'selectionchange'} as Event,
        );
        assert(selection !== null);
        assert($isRangeSelection(selection));
        // anchor stays where the drag started, inside the title slot
        const anchorNode = selection.anchor.getNode();
        expect($slotFrameKeyOf(anchorNode)).toBe(keys.title);
        // focus was pulled out of the body and into the anchor's slot frame
        const focusNode = selection.focus.getNode();
        expect($slotFrameKeyOf(focusNode)).toBe(keys.title);
        // it did not stay on the body text it was dragged to
        expect(selection.focus.key).not.toBe(keys.bodyText);
      },
      {discrete: true},
    );
  });

  test('anchor in the body, focus dragged into a slot, pushes focus past the host', () => {
    using editor = buildSlotEditor();

    const titleTextDOM = domTextNodeOf(editor, keys.titleText);
    const bodyTextDOM = domTextNodeOf(editor, keys.bodyText);

    const domSelection = getDOMSelection(editor._window ?? window);
    // anchor in the body (after, in DOM order), focus in the slot (before)
    domSelection?.removeAllRanges();
    domSelection?.setBaseAndExtent(bodyTextDOM, 1, titleTextDOM, 1);

    editor.update(
      () => {
        const selection = $internalCreateRangeSelection(
          $getSelection(),
          domSelection,
          editor,
          {type: 'selectionchange'} as Event,
        );
        assert(selection !== null);
        assert($isRangeSelection(selection));
        // anchor stays in the body (outside any slot)
        const anchorNode = selection.anchor.getNode();
        expect($slotFrameKeyOf(anchorNode)).toBe(null);
        // focus was pushed out of the slot; it is no longer inside the slot
        const focusNode = selection.focus.getNode();
        expect($slotFrameKeyOf(focusNode)).toBe(null);
        expect(selection.focus.key).not.toBe(keys.titleText);
      },
      {discrete: true},
    );
  });

  test('a selection entirely within the body is left untouched', () => {
    using editor = buildSlotEditor();

    const bodyTextDOM = domTextNodeOf(editor, keys.bodyText);

    const domSelection = getDOMSelection(editor._window ?? window);
    const range = document.createRange();
    range.setStart(bodyTextDOM, 1);
    range.setEnd(bodyTextDOM, 3);
    domSelection?.removeAllRanges();
    domSelection?.addRange(range);

    editor.update(
      () => {
        const selection = $internalCreateRangeSelection(
          $getSelection(),
          domSelection,
          editor,
          {type: 'selectionchange'} as Event,
        );
        assert(selection !== null);
        assert($isRangeSelection(selection));
        // no slot boundary crossed: both points stay on the body text
        expect(selection.anchor.key).toBe(keys.bodyText);
        expect(selection.anchor.offset).toBe(1);
        expect(selection.focus.key).toBe(keys.bodyText);
        expect(selection.focus.offset).toBe(3);
      },
      {discrete: true},
    );
  });

  test('a programmatic selection with anchor in a slot, focus in the body, clamps focus into the slot', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        const selection = $createRangeSelection();
        // anchor inside the title slot, focus in the body (different frame)
        selection.anchor.set(keys.titleText, 2, 'text');
        selection.focus.set(keys.bodyText, 2, 'text');
        $setSelection(selection);

        const active = $getSelection();
        assert($isRangeSelection(active));
        expect($slotFrameKeyOf(active.anchor.getNode())).toBe(keys.title);
        // focus pulled into the anchor's slot frame, off the body text
        expect($slotFrameKeyOf(active.focus.getNode())).toBe(keys.title);
        expect(active.focus.key).not.toBe(keys.bodyText);
      },
      {discrete: true},
    );
  });

  test('a programmatic selection with anchor in the body, focus in a slot, pushes focus past the host', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        const selection = $createRangeSelection();
        // anchor in the body (outside any slot), focus inside the title slot
        selection.anchor.set(keys.bodyText, 1, 'text');
        selection.focus.set(keys.titleText, 1, 'text');
        $setSelection(selection);

        const active = $getSelection();
        assert($isRangeSelection(active));
        expect($slotFrameKeyOf(active.anchor.getNode())).toBe(null);
        // focus pushed out of the slot
        expect($slotFrameKeyOf(active.focus.getNode())).toBe(null);
        expect(active.focus.key).not.toBe(keys.titleText);
      },
      {discrete: true},
    );
  });

  test('a programmatic selection entirely within the body is left untouched', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        $assertNodeType($getNodeByKey(keys.bodyText), $isTextNode).select(1, 3);

        const active = $getSelection();
        assert($isRangeSelection(active));
        expect(active.anchor.key).toBe(keys.bodyText);
        expect(active.anchor.offset).toBe(1);
        expect(active.focus.key).toBe(keys.bodyText);
        expect(active.focus.offset).toBe(3);
      },
      {discrete: true},
    );
  });

  test('an in-place point mutation that straddles a slot is clamped at commit', () => {
    using editor = buildSlotEditor();

    // commit a body-only selection first so there is an active RangeSelection
    editor.update(
      () => {
        $assertNodeType($getNodeByKey(keys.bodyText), $isTextNode).select(1, 2);
      },
      {discrete: true},
    );

    // mutate a point of the ACTIVE selection in place, into the slot, without
    // ever calling $setSelection — the only chokepoint left is commit time
    editor.update(
      () => {
        const active = $getSelection();
        assert($isRangeSelection(active));
        active.focus.set(keys.titleText, 1, 'text');
      },
      {discrete: true},
    );

    editor.read(() => {
      const active = $getSelection();
      assert($isRangeSelection(active));
      // anchor stays in the body, focus was pushed out of the slot at commit
      expect($slotFrameKeyOf(active.anchor.getNode())).toBe(null);
      expect($slotFrameKeyOf(active.focus.getNode())).toBe(null);
      expect(active.focus.key).not.toBe(keys.titleText);
    });
  });

  test('$selectAll from inside a slot scopes to the slot, not the whole document', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        // caret inside the title slot's text
        const selection = $assertNodeType(
          $getNodeByKey(keys.titleText),
          $isTextNode,
        ).select(1, 1);

        const out = $selectAll(selection);
        // scope is the slot's shadow root: both points stay inside the title
        // slot frame, so SELECT_ALL does not overrun into the document
        expect($slotFrameKeyOf(out.anchor.getNode())).toBe(keys.title);
        expect($slotFrameKeyOf(out.focus.getNode())).toBe(keys.title);
      },
      {discrete: true},
    );
  });

  test('$selectAll from outside any slot still scopes to the whole document', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        // caret in the body (outside any slot)
        const selection = $assertNodeType(
          $getNodeByKey(keys.bodyText),
          $isTextNode,
        ).select(1, 1);

        const out = $selectAll(selection);
        // scope is the document, not a slot: the slot fix must not shrink
        // ordinary SELECT_ALL — neither point lands inside a slot frame
        expect($slotFrameKeyOf(out.anchor.getNode())).toBe(null);
        expect($slotFrameKeyOf(out.focus.getNode())).toBe(null);
      },
      {discrete: true},
    );
  });

  test('a programmatic selection across two slots clamps focus into the anchor slot', () => {
    using editor = buildSlotEditor();

    editor.update(
      () => {
        const selection = $createRangeSelection();
        // anchor in the title slot, focus in a different slot (subtitle)
        selection.anchor.set(keys.titleText, 1, 'text');
        selection.focus.set(keys.subtitleText, 1, 'text');
        $setSelection(selection);

        const active = $getSelection();
        assert($isRangeSelection(active));
        // anchor stays in its slot
        expect($slotFrameKeyOf(active.anchor.getNode())).toBe(keys.title);
        // focus is clamped into the anchor's slot, not the subtitle slot it was set to
        expect($slotFrameKeyOf(active.focus.getNode())).toBe(keys.title);
        expect(active.focus.key).not.toBe(keys.subtitleText);
      },
      {discrete: true},
    );
  });
});

// Point.set's __DEV__ invariant rejects a Point keyed on a DecoratorNode for
// both 'text' (requires TextNode) and 'element' (requires ElementNode). These
// probes pin that the public API never lands an anchor on a slotted decorator
// key, so the non-Element branch in $clampSelectionPointsToSlotFrame (which
// would emit a text point on the decorator key) stays unreachable from any
// well-typed selection construction.
describe('named-slots: Point.set rejects decorator key targets', () => {
  const mountedRoots: HTMLElement[] = [];
  afterEach(() => {
    while (mountedRoots.length > 0) {
      const node = mountedRoots.pop();
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
  });

  function mountRoot(editor: LexicalEditorWithDispose) {
    const root = document.createElement('div');
    document.body.appendChild(root);
    mountedRoots.push(root);
    editor.setRootElement(root);
    return root;
  }

  const keys: Record<string, string> = {};
  function buildDecoratorSlotEditor() {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          const host = $createParagraphNode();
          const decoratorSlot = $createTestDecoratorNode().setIsInline(false);
          const body = $createParagraphNode();
          const bodyText = $createTextNode('Body');
          body.append(bodyText);
          $getRoot().clear().append(host);
          host.append(body);
          $setSlot(host, 'media', decoratorSlot);
          keys.host = host.getKey();
          keys.decoratorSlot = decoratorSlot.getKey();
          keys.body = body.getKey();
          keys.bodyText = bodyText.getKey();
        },
        name: '[slot-selection-decorator-key-reject]',
        nodes: [TestShadowRootNode, TestDecoratorNode],
      }),
    );
    mountRoot(editor);
    return editor;
  }

  test('Point.set rejects decorator key with text type', () => {
    using editor = buildDecoratorSlotEditor();
    editor.update(
      () => {
        const sel = $createRangeSelection();
        expect(() => sel.anchor.set(keys.decoratorSlot, 0, 'text')).toThrow();
      },
      {discrete: true},
    );
  });

  test('Point.set rejects decorator key with element type', () => {
    using editor = buildDecoratorSlotEditor();
    editor.update(
      () => {
        const sel = $createRangeSelection();
        expect(() =>
          sel.anchor.set(keys.decoratorSlot, 0, 'element'),
        ).toThrow();
      },
      {discrete: true},
    );
  });
});
