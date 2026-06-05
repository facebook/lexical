/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createNodeSelection,
  $createRangeSelection,
  $getChildCaret,
  $getDOMSlot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  createEditor,
  getDOMSelection,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$internalCreateRangeSelection} from '../../LexicalSelection';
import {$createParagraphNode} from '../../nodes/LexicalParagraphNode';
import {$createTextNode} from '../../nodes/LexicalTextNode';
import {
  $createTestDecoratorNode,
  $createTestInlineElementNode,
  $createTestShadowRootNode,
  initializeUnitTest,
  TestShadowRootNode,
} from '../utils';

// Under the strengthened setSlot guard a slot value must be a shadow-root
// container. Text content lives in a paragraph inside it, since a shadow root's
// children must be elements. $slotContainer wraps that two-layer shape so the
// slot-mechanism assertions below stay focused on the slot, not the nesting.
function $slotContainer(...texts: string[]): TestShadowRootNode {
  const container = $createTestShadowRootNode();
  for (const text of texts) {
    container.append($createParagraphNode().append($createTextNode(text)));
  }
  return container;
}

describe('named-slots: core foundation', () => {
  initializeUnitTest(testEnv => {
    test('a slotted node is reachable, parentless, and attached', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let slotKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        host.setSlot('title', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
      });

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        const slot = $getNodeByKey<TestShadowRootNode>(slotKey)!;

        // down-pointer: host -> slot by name
        expect(host.getSlot('title')!.is(slot)).toBe(true);
        expect(host.getSlotNames()).toEqual(['title']);

        // up-pointer is the slot host, not the parent
        expect(slot.getSlotHost()!.is(host)).toBe(true);
        expect(slot.getParent()).toBe(null);

        // mutual exclusivity invariant
        expect(slot.__parent).toBe(null);
        expect(slot.__slotHost).toBe(host.getKey());

        // GC safety proxy: GC gates on isAttached, which now follows __slotHost
        expect(slot.isAttached()).toBe(true);
      });
    });

    test('getTopLevelElement stops at the slot boundary', async () => {
      const {editor} = testEnv;
      let slotKey = '';
      let paraKey = '';
      let textKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('Title');
        para.append(text);
        slot.append(para);
        $getRoot().append(host);
        host.setSlot('title', slot);
        slotKey = slot.getKey();
        paraKey = para.getKey();
        textKey = text.getKey();
      });

      editor.getEditorState().read(() => {
        const slot = $getNodeByKey<TestShadowRootNode>(slotKey)!;
        const para = $getNodeByKey<ParagraphNode>(paraKey)!;
        const text = $getNodeByKey<TextNode>(textKey)!;

        // The slot value is its own isolated shadow root: a node inside it
        // resolves up to the slot's top-level child (the paragraph), and the
        // walk stops at the slot value rather than crossing to the host.
        expect(text.getTopLevelElement()!.is(para)).toBe(true);
        expect(text.getTopLevelElementOrThrow().is(para)).toBe(true);
        expect(slot.getTopLevelElement()!.is(slot)).toBe(true);
      });
    });

    test('slot map survives a host mutation (clone)', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let slotKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        host.setSlot('body', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
      });

      // mutate the host so it is cloned via getWritable -> afterCloneFrom
      await editor.update(() => {
        $getNodeByKey<ParagraphNode>(hostKey)!.setStyle('color: red');
      });

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect(host.getStyle()).toBe('color: red');
        expect(host.getSlot('body')!.getKey()).toBe(slotKey);
        expect($getNodeByKey<TestShadowRootNode>(slotKey)!.isAttached()).toBe(
          true,
        );
      });
    });

    test('setSlot rejects a node that already has a parent', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const parented = $createTestShadowRootNode();
        $getRoot().append(host).append(parented);
        expect(() => host.setSlot('title', parented)).toThrow();
      });
    });

    test('setSlot rejects a node already slotted elsewhere', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const hostA = $createParagraphNode();
        const hostB = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        $getRoot().append(hostA).append(hostB);
        hostA.setSlot('title', slot);
        expect(() => hostB.setSlot('title', slot)).toThrow();
      });
    });

    test('moving a slotted node into a child list throws (reverse guard)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const sibling = $createParagraphNode();
        $getRoot().append(host).append(sibling);

        const slot = $createTestShadowRootNode();
        host.setSlot('title', slot);

        // every child-insertion path funnels through removeFromParent first
        expect(() => host.append(slot)).toThrow();
        expect(() => sibling.insertAfter(slot)).toThrow();
        expect(() => sibling.insertBefore(slot)).toThrow();
        expect(() => sibling.replace(slot)).toThrow();
      });
    });

    test('remove() on a slotted node throws (use removeSlot)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        const slot = $createTestShadowRootNode();
        host.setSlot('title', slot);

        expect(() => slot.remove()).toThrow();
      });
    });

    test('setSlot rejects reserved names (__proto__, constructor, prototype)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);

        for (const reserved of ['__proto__', 'constructor', 'prototype']) {
          const slot = $createTestShadowRootNode();
          expect(() => host.setSlot(reserved, slot)).toThrow();
        }
      });
    });

    test('setSlot enforces shadow-root element or non-inline decorator values', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);

        // a bare text node is neither an element nor a decorator
        expect(() => host.setSlot('title', $createTextNode('x'))).toThrow(
          /not a valid slot value/,
        );
        // an element, but an inline one
        expect(() =>
          host.setSlot('title', $createTestInlineElementNode()),
        ).toThrow(/not a valid slot value/);
        // TestDecoratorNode defaults to inline
        expect(() => host.setSlot('title', $createTestDecoratorNode())).toThrow(
          /not a valid slot value/,
        );
        // a block element that is NOT a shadow root is rejected
        expect(() => host.setSlot('title', $createParagraphNode())).toThrow(
          /not a valid slot value/,
        );

        // a shadow-root element is accepted
        const shadow = $createTestShadowRootNode();
        expect(() => host.setSlot('title', shadow)).not.toThrow();
        expect(host.getSlot('title')!.is(shadow)).toBe(true);

        // a non-inline (block) decorator is accepted
        const blockDecorator = $createTestDecoratorNode().setIsInline(false);
        expect(() => host.setSlot('body', blockDecorator)).not.toThrow();
        expect(host.getSlot('body')!.is(blockDecorator)).toBe(true);
      });
    });

    test('overwriting a slot name orphans the previous occupant (no leak)', async () => {
      const {editor} = testEnv;
      let oldSlotKey = '';
      let newSlotKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const oldSlot = $createTestShadowRootNode();
        const newSlot = $createTestShadowRootNode();
        $getRoot().append(host);
        host.setSlot('title', oldSlot);
        oldSlotKey = oldSlot.getKey();
        newSlotKey = newSlot.getKey();
        // overwrite the same slot name with a different node
        host.setSlot('title', newSlot);
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        // the name now resolves to the new occupant
        expect(host.getSlot('title')!.getKey()).toBe(newSlotKey);
        // the replaced node is detached and garbage-collected, not leaked
        expect($getNodeByKey(oldSlotKey)).toBe(null);
        expect($getNodeByKey(newSlotKey)!.isAttached()).toBe(true);
      });
    });

    test('slots round-trip through serialize -> parse, alongside a normal child', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Heading');
        const normalChild = $createParagraphNode();
        normalChild.append($createTextNode('Body text'));
        $getRoot().append(host);
        host.append(normalChild);
        host.setSlot('title', title);
      });

      const stringified = JSON.stringify(editor.getEditorState().toJSON());
      const parsedState = editor.parseEditorState(stringified);

      parsedState.read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;

        // normal child survived in the linked-list channel
        expect(host.getChildren()).toHaveLength(1);
        expect(host.getTextContent()).toContain('Body text');

        // slot survived in its own keyed channel, with nested content
        const title = host.getSlot<TestShadowRootNode>('title')!;
        expect(title).not.toBe(null);
        expect(title.getTextContent()).toBe('Heading');
        expect(title.getSlotHost()!.is(host)).toBe(true);
        expect(title.getParent()).toBe(null);
        expect(title.isAttached()).toBe(true);
      });
    });

    test('export throws when a slot key resolves to no node', () => {
      // Headless (no root element): the commit skips DOM reconciliation, so
      // the deliberately-unresolvable slot key survives to export, where the
      // export invariant catches it. A mounted editor would reject the same
      // bad state earlier, when the reconciler walks the slot to render it.
      const headless = createEditor({
        namespace: 'slot-poc-headless',
        onError: error => {
          throw error;
        },
      });

      headless.update(
        () => {
          const host = $createParagraphNode();
          $getRoot().append(host);
          host.getWritable().__slots.set('ghost', 'nonexistent-key');
        },
        {discrete: true},
      );

      expect(() => headless.getEditorState().toJSON()).toThrow();
    });

    test('getTextContent reads slots-first, ahead of children', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        // slot content precedes the linked-list child content
        expect(host.getTextContent()).toBe('TitleBody');
      });
    });

    test('detaching a host garbage-collects its slot node', async () => {
      const {editor} = testEnv;
      let slotKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        host.setSlot('title', slot);
        slotKey = slot.getKey();
      });

      // slot node is in the map while the host is attached
      editor.getEditorState().read(() => {
        expect($getNodeByKey(slotKey)).not.toBe(null);
      });

      await editor.update(() => {
        $getRoot().getFirstChild()!.remove();
      });

      // after the host is detached, its slot node must not leak
      editor.getEditorState().read(() => {
        expect($getNodeByKey(slotKey)).toBe(null);
      });
    });

    test('getTextContentSize counts slots-first, like getTextContent', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        // 'Title' (5) + 'Body' (4); matches getTextContent length
        expect(host.getTextContentSize()).toBe(host.getTextContent().length);
        expect(host.getTextContentSize()).toBe(9);
      });
    });

    test('getAllTextNodes includes slot text, slots-first', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        expect(host.getAllTextNodes().map(n => n.getTextContent())).toEqual([
          'Title',
          'Body',
        ]);
      });
    });

    test('a host with slots but no children is not empty', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        $getRoot().append(host);
        host.setSlot('title', title);
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        // no linked-list children, but the slot holds content
        expect(host.getChildrenSize()).toBe(0);
        expect(host.isEmpty()).toBe(false);
      });
    });

    test('a slot subtree renders into a keyed container inside the host DOM, slots-first', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let titleTextKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        const titlePara = $createParagraphNode();
        const titleText = $createTextNode('Title');
        titlePara.append(titleText);
        title.append(titlePara);
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      });

      const hostDom = editor.getElementByKey(hostKey)!;
      const slotContainer = hostDom.querySelector(
        '[data-lexical-slot="title"]',
      );
      expect(slotContainer).not.toBe(null);
      // the slot subtree rendered inside its container
      expect(slotContainer!.textContent).toBe('Title');
      // slots-first: the slot container precedes the linked-list child DOM
      expect(hostDom.firstChild).toBe(slotContainer);
      // the slot's text node DOM is reachable by key (it reconciles normally)
      expect(editor.getElementByKey(titleTextKey)).not.toBe(null);
    });

    test('reconciler text cache folds slot text in slots-first (RootNode.__cachedText)', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
      });

      editor.getEditorState().read(() => {
        const root = $getRoot();
        const host = root.getFirstChild<ParagraphNode>()!;
        expect(host.getTextContent()).toBe('TitleBody');
        // the reconciler-built cache (RootNode.__cachedText) now matches
        // the slot-aware element walk
        expect(root.getTextContent()).toBe('TitleBody');
      });
    });

    test('a host with only a slot renders the slot and caches its text', async () => {
      const {editor} = testEnv;
      let hostKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        $getRoot().append(host);
        host.setSlot('title', title);
        hostKey = host.getKey();
      });

      const hostDom = editor.getElementByKey(hostKey)!;
      expect(
        hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
      ).toBe('Title');

      editor.getEditorState().read(() => {
        const root = $getRoot();
        expect(root.getFirstChild<ParagraphNode>()!.getTextContent()).toBe(
          'Title',
        );
        // the childless host still contributes its slot text to the cache
        expect(root.getTextContent()).toBe('Title');
      });
    });

    test('a slots-only empty host gets no terminating line break', async () => {
      const {editor} = testEnv;
      let slotHostKey = '';
      let emptyHostKey = '';

      await editor.update(() => {
        const slotHost = $createParagraphNode();
        slotHost.setSlot('title', $slotContainer('Title'));
        const emptyHost = $createParagraphNode();
        $getRoot().append(slotHost);
        $getRoot().append(emptyHost);
        slotHostKey = slotHost.getKey();
        emptyHostKey = emptyHost.getKey();
      });

      const directBr = (dom: HTMLElement) =>
        Array.from(dom.children).find(c => c.tagName === 'BR');
      // The slot already gives the host content; the empty-element <br> would
      // be a stray caret target in the host's own child area, sitting after
      // the slot container. A childless host with slots is not empty, so it
      // must not get the 'empty' terminating line break.
      expect(directBr(editor.getElementByKey(slotHostKey)!)).toBeUndefined();
      // A truly empty host (no slots, no children) still gets the br — the
      // gate is scoped to slots-only hosts.
      expect(directBr(editor.getElementByKey(emptyHostKey)!)).not.toBe(
        undefined,
      );
    });

    test('descendant navigation stays children-only (slots stay out of selection)', async () => {
      const {editor} = testEnv;
      let bodyTextKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        const bodyText = $createTextNode('Body');
        body.append(bodyText);
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
        bodyTextKey = bodyText.getKey();
      });

      editor.getEditorState().read(() => {
        const host = $getRoot().getFirstChild<ParagraphNode>()!;
        // slot 'Title' precedes 'Body' in content reads, but navigation must
        // land on the linked-list child, not the slot
        expect(host.getFirstDescendant()!.getKey()).toBe(bodyTextKey);
        expect(host.getLastDescendant()!.getKey()).toBe(bodyTextKey);
      });
    });

    test('editing slot content re-reconciles the slot in place (DOM + cache)', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let titleTextKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        const titlePara = $createParagraphNode();
        const titleText = $createTextNode('Title');
        titlePara.append(titleText);
        title.append(titlePara);
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      });

      // mutate text inside the slot subtree; the dirty must cross __slotHost
      // to dirty the host so its slot reconciles
      await editor.update(() => {
        $getNodeByKey<TextNode>(titleTextKey)!.setTextContent('Header');
      });

      const hostDom = editor.getElementByKey(hostKey)!;
      expect(
        hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
      ).toBe('Header');

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect(host.getTextContent()).toBe('HeaderBody');
        expect($getRoot().getTextContent()).toBe('HeaderBody');
      });
    });

    test('replacing a slot (same name, new node) swaps the rendered subtree', async () => {
      const {editor} = testEnv;
      let hostKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const oldTitle = $slotContainer('Old');
        $getRoot().append(host);
        host.setSlot('title', oldTitle);
        hostKey = host.getKey();
      });

      await editor.update(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        const newTitle = $slotContainer('New');
        host.setSlot('title', newTitle);
      });

      const hostDom = editor.getElementByKey(hostKey)!;
      // the existing container is reused, now holding the new subtree
      expect(
        hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
      ).toBe('New');

      editor.getEditorState().read(() => {
        expect($getRoot().getTextContent()).toBe('New');
      });
    });

    test('removing then re-adding a slot name reorders its container to match the Map', async () => {
      const {editor} = testEnv;
      let hostKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        host.setSlot('a', $slotContainer('A'));
        host.setSlot('b', $slotContainer('B'));
        hostKey = host.getKey();
      });

      await editor.update(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        // Drop 'a' and re-add it: in the Map it now trails 'b'.
        host.removeSlot('a');
        host.setSlot('a', $slotContainer('A2'));
      });

      let modelOrder: string[] = [];
      editor.getEditorState().read(() => {
        modelOrder = $getNodeByKey<ParagraphNode>(hostKey)!.getSlotNames();
      });
      expect(modelOrder).toEqual(['b', 'a']);

      const hostDom = editor.getElementByKey(hostKey)!;
      const domOrder = Array.from(hostDom.children)
        .filter(child => child.hasAttribute('data-lexical-slot'))
        .map(child => child.getAttribute('data-lexical-slot'));
      // The reconciler moves the reused container so the DOM matches the Map
      // order rather than the original insertion order.
      expect(domOrder).toEqual(modelOrder);
    });

    test('suffix fast path keeps slot text when a slot and a suffix child are edited together', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let titleTextKey = '';
      const childTextKeys: string[] = [];

      // host with a 'title' slot and 5 linked-list children, enough to clear
      // MIN_FAST_PATH_CHILDREN (4) so the suffix-incremental fast path engages
      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        const titlePara = $createParagraphNode();
        const titleText = $createTextNode('Title');
        titlePara.append(titleText);
        title.append(titlePara);
        $getRoot().append(host);
        for (let i = 0; i < 5; i++) {
          const child = $createParagraphNode();
          const childText = $createTextNode(`c${i}`);
          child.append(childText);
          host.append(child);
          childTextKeys.push(childText.getKey());
        }
        host.setSlot('title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      });

      // single update: edit the slot text AND the last (suffix) child together
      await editor.update(() => {
        $getNodeByKey<TextNode>(titleTextKey)!.setTextContent('Header');
        $getNodeByKey<TextNode>(childTextKeys[4])!.setTextContent('c4!');
      });

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        // element walk is the slot-aware ground truth; the reconciler cache
        // (RootNode.__cachedText, read by root.getTextContent) must match it
        expect($getRoot().getTextContent()).toBe(host.getTextContent());
        // and the slot text must be the freshly edited value, slots-first
        expect(host.getTextContent().startsWith('Header')).toBe(true);
        expect(host.getTextContent()).toContain('c4!');
      });
    });

    test('suffix fast path keeps slot text when only a suffix child is edited', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      const childTextKeys: string[] = [];

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        $getRoot().append(host);
        for (let i = 0; i < 5; i++) {
          const child = $createParagraphNode();
          const childText = $createTextNode(`c${i}`);
          child.append(childText);
          host.append(child);
          childTextKeys.push(childText.getKey());
        }
        host.setSlot('title', title);
        hostKey = host.getKey();
      });

      // edit only a suffix child; the slot is untouched this cycle
      await editor.update(() => {
        $getNodeByKey<TextNode>(childTextKeys[4])!.setTextContent('c4!');
      });

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect($getRoot().getTextContent()).toBe(host.getTextContent());
        expect(host.getTextContent().startsWith('Title')).toBe(true);
      });
    });

    test('removing a slot drops its container and its text from the cache', async () => {
      const {editor} = testEnv;
      let hostKey = '';

      await editor.update(() => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot('title', title);
        hostKey = host.getKey();
      });

      await editor.update(() => {
        // no removeSlot API yet; delete from the writable slot map directly
        $getNodeByKey<ParagraphNode>(hostKey)!
          .getWritable()
          .__slots.delete('title');
      });

      const hostDom = editor.getElementByKey(hostKey)!;
      expect(hostDom.querySelector('[data-lexical-slot="title"]')).toBe(null);

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect(host.getTextContent()).toBe('Body');
        expect($getRoot().getTextContent()).toBe('Body');
      });
    });

    test('removing the host last child keeps its slot containers in the DOM', async () => {
      const {editor} = testEnv;
      let childKey = '';
      let hostKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        const child = $createTextNode('A');
        host.append(child);
        host.setSlot('title', $slotContainer('TT'));
        $getRoot().append(host);
        childKey = child.getKey();
        hostKey = host.getKey();
      });

      await editor.update(() => {
        $getNodeByKey<TextNode>(childKey)!.remove();
      });

      editor.getEditorState().read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect(host.getSlotNames()).toEqual(['title']);
        expect(host.getTextContent()).toBe('TT');
      });

      // The empty-children fast path clears the host DOM with
      // `textContent = ''`; with a slot present it must take the keyed slow
      // path so the prepended slot container survives.
      const hostDom = editor.getElementByKey(hostKey)!;
      const slotDom = hostDom.querySelector('[data-lexical-slot="title"]');
      expect(slotDom).not.toBe(null);
      expect(slotDom!.textContent).toBe('TT');
    });

    test('a document-wide RangeSelection carries slot text', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const before = $createParagraphNode().append($createTextNode('BEFORE'));
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        const after = $createParagraphNode().append($createTextNode('AFTER'));
        $getRoot().append(before, host, after);
        host.setSlot('title', slot);
      });
      let text = '';
      await editor.update(() => {
        const root = $getRoot();
        const sel = $createRangeSelection();
        sel.anchor.set(root.getKey(), 0, 'element');
        sel.focus.set(root.getKey(), root.getChildrenSize(), 'element');
        $setSelection(sel);
        text = sel.getTextContent();
      });
      expect(text).toContain('SLOTTEXT');
    });

    test('replace(includeChildren) carries slots onto the replacement', async () => {
      const {editor} = testEnv;
      let survived = false;
      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        host.setSlot('title', slot);
        const newHost = $createParagraphNode();
        host.replace(newHost, true);
        const got = newHost.getSlot<TestShadowRootNode>('title');
        survived = got !== null && got.getTextContent() === 'SLOTTEXT';
      });
      expect(survived).toBe(true);
    });

    test('NodeSelection.insertNodes leaves a slotted node intact', async () => {
      const {editor} = testEnv;
      let slotKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        host.setSlot('title', slot);
        slotKey = slot.getKey();
      });
      let caught: unknown = null;
      await editor.update(() => {
        const ns = $createNodeSelection();
        ns.add(slotKey);
        $setSelection(ns);
        try {
          ns.insertNodes([$createParagraphNode()]);
        } catch (e) {
          caught = e;
        }
      });
      expect(caught).toBe(null);
      let survived = false;
      editor.read(() => {
        const host = $getRoot().getFirstChild() as ParagraphNode;
        const slot = host.getSlot<TestShadowRootNode>('title');
        survived = slot !== null && slot.getTextContent() === 'SLOTTEXT';
      });
      expect(survived).toBe(true);
    });

    test('NodeSelection.deleteNodes leaves a slotted node intact', async () => {
      const {editor} = testEnv;
      let slotKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        host.setSlot('title', slot);
        slotKey = slot.getKey();
      });
      let caught: unknown = null;
      await editor.update(() => {
        const ns = $createNodeSelection();
        ns.add(slotKey);
        $setSelection(ns);
        try {
          ns.deleteNodes();
        } catch (e) {
          caught = e;
        }
      });
      expect(caught).toBe(null);
      let survived = false;
      editor.read(() => {
        const host = $getRoot().getFirstChild() as ParagraphNode;
        const slot = host.getSlot<TestShadowRootNode>('title');
        survived = slot !== null && slot.getTextContent() === 'SLOTTEXT';
      });
      expect(survived).toBe(true);
    });

    test('removeText inside a slot stays scoped and does not walk past the slot boundary', async () => {
      const {editor} = testEnv;
      let textKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('SLOTTEXT');
        para.append(text);
        slot.append(para);
        $getRoot().append(host);
        host.setSlot('title', slot);
        textKey = text.getKey();
      });
      let caught: unknown = null;
      await editor.update(() => {
        const text = $getNodeByKey<TextNode>(textKey)!;
        const sel = $createRangeSelection();
        sel.anchor.set(textKey, 0, 'text');
        sel.focus.set(textKey, 4, 'text');
        $setSelection(sel);
        try {
          sel.removeText();
        } catch (e) {
          caught = e;
        }
        void text;
      });
      expect(caught).toBe(null);
      let remaining = '';
      editor.read(() => {
        const host = $getRoot().getFirstChild() as ParagraphNode;
        remaining = host.getSlot<TestShadowRootNode>('title')!.getTextContent();
      });
      expect(remaining).toBe('TEXT');
    });

    test('backspace at the start of a host child does not merge the slot-bearing host away', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let childKey = '';
      await editor.update(() => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('AAA')),
        );
        const host = $createParagraphNode();
        host.setSlot('title', $slotContainer('TITLE'));
        const child = $createTextNode('BBB');
        host.append(child);
        $getRoot().append(host);
        hostKey = host.getKey();
        childKey = child.getKey();
      });
      await editor.update(() => {
        const sel = $createRangeSelection();
        sel.anchor.set(childKey, 0, 'text');
        sel.focus.set(childKey, 0, 'text');
        $setSelection(sel);
        sel.deleteCharacter(true);
      });
      editor.read(() => {
        // The host, its slot, and its child all survive: a slot-bearing host
        // is never merged away, since the merge would discard its slots.
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        expect($getRoot().getChildrenSize()).toBe(2);
        expect(host.getSlotNames()).toEqual(['title']);
        expect(
          host.getSlot<TestShadowRootNode>('title')!.getTextContent(),
        ).toBe('TITLE');
        expect(host.getTextContent()).toBe('TITLEBBB');
        // The caret stays where it was rather than jumping into the prior block.
        const sel = $getSelection();
        expect($isRangeSelection(sel)).toBe(true);
        if ($isRangeSelection(sel)) {
          expect(sel.anchor.key).toBe(childKey);
          expect(sel.anchor.offset).toBe(0);
        }
      });
    });

    test('a slot added after initial render renders slots-first in the DOM', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        host.append($createParagraphNode().append($createTextNode('BODY')));
        $getRoot().append(host);
        hostKey = host.getKey();
      });
      await editor.update(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        host.setSlot('title', $slotContainer('TITLE'));
      });
      const hostDom = editor.getElementByKey(hostKey)!;
      const order = Array.from(hostDom.children).map(child =>
        child.getAttribute('data-lexical-slot'),
      );
      // The slot container sits ahead of the body child, matching the
      // create-path order, rather than being appended after it.
      expect(order).toEqual(['title', null]);
    });

    test('getParentCaret stops at a slot value in every mode', async () => {
      const {editor} = testEnv;
      let slotKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        host.setSlot('title', $slotContainer('TITLE'));
        slotKey = host.getSlot('title')!.getKey();
      });

      editor.getEditorState().read(() => {
        const slot = $getNodeByKey<TestShadowRootNode>(slotKey)!;
        // A ChildCaret's parent-at-caret is the origin itself, so walking up
        // from inside the slot hands $filterByMode the slot value. Its
        // __parent is null (the up-link is __slotHost), so the only correct
        // answer is to stop here — in 'root' mode too, where a normal shadow
        // root would otherwise be walked through.
        const childCaret = $getChildCaret(slot, 'next');
        expect(childCaret.getParentCaret('root')).toBe(null);
        expect(childCaret.getParentCaret('shadowRoot')).toBe(null);
      });
    });

    test('child DOM index skips prepended slots in a coexistence host', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      let childAKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        const childA = $createParagraphNode().append($createTextNode('A'));
        const childB = $createParagraphNode().append($createTextNode('B'));
        $getRoot().append(host);
        host.append(childA, childB);
        host.setSlot('title', $slotContainer('Title'));
        hostKey = host.getKey();
        childAKey = childA.getKey();
      });

      editor.read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        const hostDom = editor.getElementByKey(hostKey)!;
        const childADom = editor.getElementByKey(childAKey)!;
        // DOM is slots-first: [slotContainer, childA, childB].
        expect(
          (hostDom.firstChild as Element).getAttribute('data-lexical-slot'),
        ).toBe('title');
        expect(hostDom.childNodes[1]).toBe(childADom);

        const domSlot = $getDOMSlot(host, hostDom, editor);
        // The leading boundary steps over the slot container: the first
        // managed child is childA, and the offset counts the one slot.
        expect(domSlot.getFirstChild()).toBe(childADom);
        expect(domSlot.getFirstChildOffset()).toBe(1);
        // A DOM selection at host element-offset 2 sits between childA and
        // childB; it must map to lexical child index 1, not 2.
        const [resolvedEl, idx] = domSlot.resolveChildIndex(
          host,
          hostDom,
          hostDom,
          2,
        );
        expect(resolvedEl.getKey()).toBe(hostKey);
        expect(idx).toBe(1);
      });
    });

    test('a childless slot host reports no managed first child', async () => {
      const {editor} = testEnv;
      let hostKey = '';
      await editor.update(() => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        host.setSlot('title', $slotContainer('Title'));
        hostKey = host.getKey();
      });

      editor.read(() => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        const hostDom = editor.getElementByKey(hostKey)!;
        const domSlot = $getDOMSlot(host, hostDom, editor);
        // The slot container is not a managed child, so a host with only a
        // slot still has no first child.
        expect(domSlot.getFirstChild()).toBe(null);
      });
    });
  });
});

// A slot name flows into the reconciler's container lookup. An earlier
// implementation interpolated the name into a CSS selector
// (`:scope > [data-lexical-slot="${name}"]`); a name carrying a quote or a
// bracket broke that selector and threw during reconcile. The lookup now
// matches by string equality, so such a name must reconcile in place.
//
// The signal is DOM-element identity, not onError: in jsdom the selector throw
// is a DOMException, which is not `instanceof Error`, so the reconcile catch in
// $commitPendingUpdates skips onError and silently recovers via a full
// reconcile (see feedback_lexical_test_subclass_jsdom_pitfalls). That full
// recovery rebuilds every DOM node, so the host element is replaced; an
// in-place slot reconcile preserves it. Asserting the host element survives the
// slot replace therefore fails on the throwing path and passes on the fixed one.
describe('named-slots: slot name with selector metacharacters', () => {
  test('reconciling a slot with such a name does not rebuild the host DOM', () => {
    const editor = createEditor({
      namespace: 'slot-meta',
      nodes: [TestShadowRootNode],
      onError: e => {
        throw e;
      },
    });
    const rootElement = document.createElement('div');
    rootElement.contentEditable = 'true';
    document.body.appendChild(rootElement);
    editor.setRootElement(rootElement);

    const oddName = 'te"st]';
    let hostKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        host.setSlot(oddName, $slotContainer('Title'));
        hostKey = host.getKey();
      },
      {discrete: true},
    );
    const hostDomBefore = editor.getElementByKey(hostKey);

    // replace (same name, new node): hits the container lookup on reconcile
    editor.update(
      () => {
        $getNodeByKey<ParagraphNode>(hostKey)!.setSlot(
          oddName,
          $slotContainer('Header'),
        );
      },
      {discrete: true},
    );
    const hostDomAfter = editor.getElementByKey(hostKey);

    // in-place reconcile keeps the host element; a recovery rebuild would not
    expect(hostDomAfter).toBe(hostDomBefore);
    expect(
      hostDomAfter!.firstElementChild!.getAttribute('data-lexical-slot'),
    ).toBe(oddName);
    expect(hostDomAfter!.firstElementChild!.textContent).toBe('Header');

    // remove: hits the stale-container lookup on reconcile
    editor.update(
      () => {
        $getNodeByKey<ParagraphNode>(hostKey)!.removeSlot(oddName);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect(host.getSlotNames()).toEqual([]);
      expect(host.getTextContent()).toBe('Body');
    });

    editor.setRootElement(null);
    document.body.removeChild(rootElement);
  });
});

// A native selectionchange can land the DOM caret directly on a slotted
// DecoratorNode's keyed DOM (e.g. clicking a Figure whose `media` slot holds a
// block decorator). $internalResolveSelectionPoint's leaf branch anchors such a
// point in the leaf's parent via getParentOrThrow(), but a slot value is
// parentless (__parent === null, reached via __slotHost), so it threw
// "Expected node N to have a parent." A slotted decorator must resolve like a
// normal decorator: the point anchors adjacent to the host in the host's
// parent, then the both-decorator guard drops it to null (a decorator caret is
// not a RangeSelection — the consumer promotes it to a NodeSelection).
describe('named-slots: selection resolution onto a slotted decorator', () => {
  function resolveCaretOnDecorator(
    editor: ReturnType<typeof createEditor>,
    decoratorKey: string,
  ) {
    const decoratorDom = editor.getElementByKey(decoratorKey);
    expect(decoratorDom).not.toBe(null);
    const domSelection = getDOMSelection(editor._window ?? window);
    const range = document.createRange();
    range.setStart(decoratorDom!, 0);
    range.collapse(true);
    domSelection!.removeAllRanges();
    domSelection!.addRange(range);

    let result: ReturnType<typeof $internalCreateRangeSelection> | undefined;
    editor.update(
      () => {
        result = $internalCreateRangeSelection(
          $getSelection(),
          domSelection,
          editor,
          {type: 'selectionchange'} as Event,
        );
      },
      {discrete: true},
    );
    return result;
  }

  initializeUnitTest(testEnv => {
    test('a slotted block decorator resolves like a normal block decorator (no throw, null RangeSelection)', async () => {
      const {editor} = testEnv;
      let slottedKey = '';
      let childKey = '';

      await editor.update(
        () => {
          // host whose `media` slot holds a block decorator (Figure shape)
          const host = $createParagraphNode();
          const slotted = $createTestDecoratorNode().setIsInline(false);
          host.setSlot('media', slotted);
          // baseline: a normal block decorator as an ordinary child
          const sibling = $createParagraphNode();
          const child = $createTestDecoratorNode().setIsInline(false);
          sibling.append(child);
          $getRoot().append(host).append(sibling);
          slottedKey = slotted.getKey();
          childKey = child.getKey();
        },
        {discrete: true},
      );

      // Before the fix the slotted path threw "Expected node N to have a
      // parent." Both paths now resolve identically: a decorator caret is not
      // captured as a RangeSelection (returns null).
      expect(resolveCaretOnDecorator(editor, childKey)).toBe(null);
      expect(resolveCaretOnDecorator(editor, slottedKey)).toBe(null);
    });
  });
});
