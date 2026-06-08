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
  $createNodeSelection,
  $createRangeSelection,
  $getChildCaret,
  $getDOMSlot,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $getSlot,
  $getSlotContainer,
  $getSlotHost,
  $getSlotNames,
  $isRangeSelection,
  $removeSlot,
  $setSelection,
  $setSlot,
  createEditor,
  defineExtension,
  getDOMSelection,
  ParagraphNode,
  TextNode,
} from 'lexical';
import {afterEach, assert, describe, expect, test} from 'vitest';

import {$internalCreateRangeSelection} from '../../LexicalSelection';
import {$createParagraphNode} from '../../nodes/LexicalParagraphNode';
import {$createTextNode} from '../../nodes/LexicalTextNode';
import {
  $createTestDecoratorNode,
  $createTestInlineElementNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestInlineElementNode,
  TestShadowRootNode,
  TestUpdateDOMTrueHostNode,
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

const mountedRoots: HTMLElement[] = [];
afterEach(() => {
  while (mountedRoots.length > 0) {
    const node = mountedRoots.pop();
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
});

function createSlotEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      // start from an empty root, matching a bare unit-test editor; the
      // default extension state seeds an empty paragraph otherwise
      $initialEditorState: () => {
        $getRoot().clear();
      },
      name: '[slot-core]',
      nodes: [TestShadowRootNode, TestDecoratorNode, TestInlineElementNode],
    }),
  );
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  mountedRoots.push(root);
  editor.setRootElement(root);
  return editor;
}

describe('named-slots: core foundation', () => {
  test('a slotted node is reachable, parentless, and attached', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let slotKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      const slot = $getNodeByKey<TestShadowRootNode>(slotKey)!;

      // down-pointer: host -> slot by name
      expect($getSlot(host, 'title')!.is(slot)).toBe(true);
      expect($getSlotNames(host)).toEqual(['title']);

      // up-pointer is the slot host, not the parent
      expect($getSlotHost(slot)!.is(host)).toBe(true);
      expect(slot.getParent()).toBe(null);

      // mutual exclusivity invariant
      expect(slot.__parent).toBe(null);
      expect(slot.__slotHost).toBe(host.getKey());

      // GC safety proxy: GC gates on isAttached, which now follows __slotHost
      expect(slot.isAttached()).toBe(true);
    });
  });

  test('getTopLevelElement stops at the slot boundary', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    let paraKey = '';
    let textKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('Title');
        para.append(text);
        slot.append(para);
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        slotKey = slot.getKey();
        paraKey = para.getKey();
        textKey = text.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
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

  test('slot map survives a host mutation (clone)', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let slotKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        $setSlot(host, 'body', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
      },
      {discrete: true},
    );

    // mutate the host so it is cloned via getWritable -> afterCloneFrom
    editor.update(
      () => {
        $getNodeByKey<ParagraphNode>(hostKey)!.setStyle('color: red');
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect(host.getStyle()).toBe('color: red');
      expect($getSlot(host, 'body')!.getKey()).toBe(slotKey);
      expect($getNodeByKey<TestShadowRootNode>(slotKey)!.isAttached()).toBe(
        true,
      );
    });
  });

  test('setSlot detaches a node that already has a parent', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const parented = $createTestShadowRootNode();
        $getRoot().append(host).append(parented);
        expect(parented.getParent()).toBe($getRoot());

        $setSlot(host, 'title', parented);

        // setSlot detaches it from the child list, then slots it; a slotted
        // node and a child are mutually exclusive, so its parent is now null.
        expect(parented.getParent()).toBe(null);
        expect($getRoot().getChildrenSize()).toBe(1);
        expect($getSlot(host, 'title')!.getKey()).toBe(parented.getKey());
      },
      {discrete: true},
    );
  });

  test('setSlot rejects a node already slotted elsewhere', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const hostA = $createParagraphNode();
        const hostB = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        $getRoot().append(hostA).append(hostB);
        $setSlot(hostA, 'title', slot);
        expect(() => $setSlot(hostB, 'title', slot)).toThrow();
      },
      {discrete: true},
    );
  });

  // A node hosting itself, or an ancestor, would make __slotHost point back
  // into the host's own up-chain, so isAttached/GC loop forever. The value-type
  // guard runs first, so the cycle is only reachable for nodes that are valid
  // slot values too (shadow roots / non-inline decorators) — use shadow roots.
  test('setSlot rejects hosting itself or an ancestor (cycle guard)', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const outer = $createTestShadowRootNode();
        const inner = $createTestShadowRootNode();
        $getRoot().append(outer);
        outer.append(inner);

        // self-host
        expect(() => $setSlot(outer, 'x', outer)).toThrow(/cycle/);
        // ancestor-host via children: inner would slot its own parent
        expect(() => $setSlot(inner, 'x', outer)).toThrow(/cycle/);
      },
      {discrete: true},
    );
  });

  // The ancestor may be reachable only through a slot up-link, not the
  // __parent chain isParentOf walks: a hosts b in a slot, so b.__parent is
  // null and b's only up-link is __slotHost -> a. Slotting a back into b must
  // still be rejected, or the two __slotHost links close a cycle.
  test('setSlot rejects an ancestor reachable through a slot up-link', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const a = $createTestShadowRootNode();
        const b = $createTestShadowRootNode();
        $getRoot().append(a);
        $setSlot(a, 'x', b);

        expect(() => $setSlot(b, 'y', a)).toThrow(/cycle/);
      },
      {discrete: true},
    );
  });

  test('moving a slotted node into a child list throws (reverse guard)', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const sibling = $createParagraphNode();
        $getRoot().append(host).append(sibling);

        const slot = $createTestShadowRootNode();
        $setSlot(host, 'title', slot);

        // every child-insertion path funnels through removeFromParent first
        expect(() => host.append(slot)).toThrow();
        expect(() => sibling.insertAfter(slot)).toThrow();
        expect(() => sibling.insertBefore(slot)).toThrow();
        expect(() => sibling.replace(slot)).toThrow();
      },
      {discrete: true},
    );
  });

  test('remove() on a slotted node throws (use removeSlot)', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        const slot = $createTestShadowRootNode();
        $setSlot(host, 'title', slot);

        expect(() => slot.remove()).toThrow();
      },
      {discrete: true},
    );
  });

  test('setSlot rejects reserved names (__proto__, constructor, prototype)', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);

        for (const reserved of ['__proto__', 'constructor', 'prototype']) {
          const slot = $createTestShadowRootNode();
          expect(() => $setSlot(host, reserved, slot)).toThrow();
        }
      },
      {discrete: true},
    );
  });

  test('setSlot enforces shadow-root element or non-inline decorator values', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);

        // a bare text node is neither an element nor a decorator
        expect(() => $setSlot(host, 'title', $createTextNode('x'))).toThrow(
          /not a valid slot value/,
        );
        // an element, but an inline one
        expect(() =>
          $setSlot(host, 'title', $createTestInlineElementNode()),
        ).toThrow(/not a valid slot value/);
        // TestDecoratorNode defaults to inline
        expect(() =>
          $setSlot(host, 'title', $createTestDecoratorNode()),
        ).toThrow(/not a valid slot value/);
        // a block element that is NOT a shadow root is rejected
        expect(() => $setSlot(host, 'title', $createParagraphNode())).toThrow(
          /not a valid slot value/,
        );

        // a shadow-root element is accepted
        const shadow = $createTestShadowRootNode();
        expect(() => $setSlot(host, 'title', shadow)).not.toThrow();
        expect($getSlot(host, 'title')!.is(shadow)).toBe(true);

        // a non-inline (block) decorator is accepted
        const blockDecorator = $createTestDecoratorNode().setIsInline(false);
        expect(() => $setSlot(host, 'body', blockDecorator)).not.toThrow();
        expect($getSlot(host, 'body')!.is(blockDecorator)).toBe(true);
      },
      {discrete: true},
    );
  });

  test('overwriting a slot name orphans the previous occupant (no leak)', () => {
    using editor = createSlotEditor();
    let oldSlotKey = '';
    let newSlotKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const oldSlot = $createTestShadowRootNode();
        const newSlot = $createTestShadowRootNode();
        $getRoot().append(host);
        $setSlot(host, 'title', oldSlot);
        oldSlotKey = oldSlot.getKey();
        newSlotKey = newSlot.getKey();
        // overwrite the same slot name with a different node
        $setSlot(host, 'title', newSlot);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      // the name now resolves to the new occupant
      expect($getSlot(host, 'title')!.getKey()).toBe(newSlotKey);
      // the replaced node is detached and garbage-collected, not leaked
      expect($getNodeByKey(oldSlotKey)).toBe(null);
      expect($getNodeByKey(newSlotKey)!.isAttached()).toBe(true);
    });
  });

  test('slots round-trip through serialize -> parse, alongside a normal child', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Heading');
        const normalChild = $createParagraphNode();
        normalChild.append($createTextNode('Body text'));
        $getRoot().append(host);
        host.append(normalChild);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    const stringified = JSON.stringify(editor.getEditorState().toJSON());
    const parsedState = editor.parseEditorState(stringified);

    parsedState.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;

      // normal child survived in the linked-list channel
      expect(host.getChildren()).toHaveLength(1);
      expect(host.getTextContent()).toContain('Body text');

      // slot survived in its own keyed channel, with nested content
      const title = $getSlot<TestShadowRootNode>(host, 'title')!;
      expect(title).not.toBe(null);
      expect(title.getTextContent()).toBe('Heading');
      expect($getSlotHost(title)!.is(host)).toBe(true);
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
        const writableHost = host.getWritable();
        if (writableHost.__slots === null) {
          writableHost.__slots = new Map();
        }
        writableHost.__slots.set('ghost', 'nonexistent-key');
      },
      {discrete: true},
    );

    expect(() => headless.getEditorState().toJSON()).toThrow();
  });

  test('getTextContent reads slots-first, ahead of children', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      // slot content precedes the linked-list child content
      expect(host.getTextContent()).toBe('TitleBody');
    });
  });

  test('detaching a host garbage-collects its slot node', () => {
    using editor = createSlotEditor();
    let slotKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer();
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        slotKey = slot.getKey();
      },
      {discrete: true},
    );

    // slot node is in the map while the host is attached
    editor.read(() => {
      expect($getNodeByKey(slotKey)).not.toBe(null);
    });

    editor.update(
      () => {
        $getRoot().getFirstChild()!.remove();
      },
      {discrete: true},
    );

    // after the host is detached, its slot node must not leak
    editor.read(() => {
      expect($getNodeByKey(slotKey)).toBe(null);
    });
  });

  test('detaching a decorator host garbage-collects its slot node', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    let textKey = '';

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const slot = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('Slotted');
        para.append(text);
        slot.append(para);
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        slotKey = slot.getKey();
        textKey = text.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($getNodeByKey(slotKey)).not.toBe(null);
      expect($getNodeByKey(textKey)).not.toBe(null);
    });

    editor.update(
      () => {
        $getRoot().getFirstChild()!.remove();
      },
      {discrete: true},
    );

    // a decorator host is a leaf, so without the slot-aware leaf walk its
    // slot subtree would orphan in the node map
    editor.read(() => {
      expect($getNodeByKey(slotKey)).toBe(null);
      expect($getNodeByKey(textKey)).toBe(null);
    });
  });

  test('getTextContentSize counts slots-first, like getTextContent', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      // 'Title' (5) + 'Body' (4); matches getTextContent length
      expect(host.getTextContentSize()).toBe(host.getTextContent().length);
      expect(host.getTextContentSize()).toBe(9);
    });
  });

  test('getAllTextNodes includes slot text, slots-first', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      expect(host.getAllTextNodes().map(n => n.getTextContent())).toEqual([
        'Title',
        'Body',
      ]);
    });
  });

  test('a host with slots but no children is not empty', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        $getRoot().append(host);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      // no linked-list children, but the slot holds content
      expect(host.getChildrenSize()).toBe(0);
      expect(host.isEmpty()).toBe(false);
    });
  });

  test('a slot subtree renders into a keyed container inside the host DOM, slots-first', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let titleTextKey = '';

    editor.update(
      () => {
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
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    const slotContainer = hostDom.querySelector('[data-lexical-slot="title"]');
    expect(slotContainer).not.toBe(null);
    // the slot subtree rendered inside its container
    expect(slotContainer!.textContent).toBe('Title');
    // slots-first: the slot container precedes the linked-list child DOM
    expect(hostDom.firstChild).toBe(slotContainer);
    // the slot's text node DOM is reachable by key (it reconciles normally)
    expect(editor.getElementByKey(titleTextKey)).not.toBe(null);
  });

  test('a decorator host renders its slot into an editable detached keyed container', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let slotKey = '';
    let titleTextKey = '';

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const title = $createTestShadowRootNode();
        const titlePara = $createParagraphNode();
        const titleText = $createTextNode('Title');
        titlePara.append(titleText);
        title.append(titlePara);
        $getRoot().append(host);
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
        slotKey = title.getKey();
        titleTextKey = titleText.getKey();
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    // the decorator dom itself stays non-editable
    expect(hostDom.contentEditable).toBe('false');
    // a decorator host leaves its slot container detached for the
    // lexical-react component to place; it never lands in the host DOM
    expect(hostDom.querySelector('[data-lexical-slot="title"]')).toBe(null);
    // the container is discoverable by the slotted key (its DOM's parent)
    const slotContainer = editor.getElementByKey(slotKey)!.parentElement!;
    expect(slotContainer.getAttribute('data-lexical-slot')).toBe('title');
    expect(hostDom.contains(slotContainer)).toBe(false);
    // a decorator-host slot opts its container into editing so the otherwise
    // non-editable decorator chrome still hosts an editable region
    expect(slotContainer.contentEditable).toBe('true');
    expect(slotContainer.textContent).toBe('Title');
    expect(editor.getElementByKey(titleTextKey)).not.toBe(null);
  });

  test('editing a decorator-host slot re-reconciles it in place', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    let textKey = '';

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const title = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('Before');
        para.append(text);
        title.append(para);
        $getRoot().append(host);
        $setSlot(host, 'title', title);
        slotKey = title.getKey();
        textKey = text.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $getNodeByKey<TextNode>(textKey)!.setTextContent('After');
      },
      {discrete: true},
    );

    const slotContainer = editor.getElementByKey(slotKey)!.parentElement!;
    expect(slotContainer.getAttribute('data-lexical-slot')).toBe('title');
    expect(slotContainer.textContent).toBe('After');
  });

  test('$getSlotContainer resolves a host slot container by key, null when empty', () => {
    using editor = createSlotEditor();
    let decoratorKey = '';
    let elementKey = '';

    editor.update(
      () => {
        const root = $getRoot();
        const decorator = $createTestDecoratorNode().setIsInline(false);
        $setSlot(decorator, 'title', $slotContainer('Deco'));
        root.append(decorator);
        const element = $createParagraphNode();
        $setSlot(element, 'title', $slotContainer('Elem'));
        element.append($createTextNode('body'));
        root.append(element);
        decoratorKey = decorator.getKey();
        elementKey = element.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
      const decorator = $getNodeByKey(decoratorKey)!;
      const element = $getNodeByKey(elementKey)!;
      const decoratorContainer = $getSlotContainer(decorator, 'title')!;
      const elementContainer = $getSlotContainer(element, 'title')!;
      expect(decoratorContainer.getAttribute('data-lexical-slot')).toBe(
        'title',
      );
      expect(elementContainer.getAttribute('data-lexical-slot')).toBe('title');
      expect(decoratorContainer.textContent).toBe('Deco');
      expect(elementContainer.textContent).toBe('Elem');
      // a decorator host's container is detached; an element host's sits inside
      // the host DOM
      const decoratorDom = editor.getElementByKey(decoratorKey)!;
      const elementDom = editor.getElementByKey(elementKey)!;
      expect(decoratorDom.contains(decoratorContainer)).toBe(false);
      expect(elementDom.contains(elementContainer)).toBe(true);
      // an empty slot name resolves to null
      expect($getSlotContainer(decorator, 'missing')).toBe(null);
    });
  });

  test('reconciler text cache folds slot text in slots-first (RootNode.__cachedText)', () => {
    using editor = createSlotEditor();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
      },
      {discrete: true},
    );

    editor.read(() => {
      const root = $getRoot();
      const host = root.getFirstChild<ParagraphNode>()!;
      expect(host.getTextContent()).toBe('TitleBody');
      // the reconciler-built cache (RootNode.__cachedText) now matches
      // the slot-aware element walk
      expect(root.getTextContent()).toBe('TitleBody');
    });
  });

  test('a host with only a slot renders the slot and caches its text', () => {
    using editor = createSlotEditor();
    let hostKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        $getRoot().append(host);
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    expect(
      hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
    ).toBe('Title');

    editor.read(() => {
      const root = $getRoot();
      expect(root.getFirstChild<ParagraphNode>()!.getTextContent()).toBe(
        'Title',
      );
      // the childless host still contributes its slot text to the cache
      expect(root.getTextContent()).toBe('Title');
    });
  });

  test('a slots-only empty host gets no terminating line break', () => {
    using editor = createSlotEditor();
    let slotHostKey = '';
    let emptyHostKey = '';

    editor.update(
      () => {
        const slotHost = $createParagraphNode();
        $setSlot(slotHost, 'title', $slotContainer('Title'));
        const emptyHost = $createParagraphNode();
        $getRoot().append(slotHost);
        $getRoot().append(emptyHost);
        slotHostKey = slotHost.getKey();
        emptyHostKey = emptyHost.getKey();
      },
      {discrete: true},
    );

    const directBr = (dom: HTMLElement) =>
      Array.from(dom.children).find(c => c.tagName === 'BR');
    // The slot already gives the host content; the empty-element <br> would
    // be a stray caret target in the host's own child area, sitting after
    // the slot container. A childless host with slots is not empty, so it
    // must not get the 'empty' terminating line break.
    expect(directBr(editor.getElementByKey(slotHostKey)!)).toBeUndefined();
    // A truly empty host (no slots, no children) still gets the br — the
    // gate is scoped to slots-only hosts.
    expect(directBr(editor.getElementByKey(emptyHostKey)!)).not.toBe(undefined);
  });

  test('descendant navigation stays children-only (slots stay out of selection)', () => {
    using editor = createSlotEditor();
    let bodyTextKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        const bodyText = $createTextNode('Body');
        body.append(bodyText);
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
        bodyTextKey = bodyText.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getRoot().getFirstChild<ParagraphNode>()!;
      // slot 'Title' precedes 'Body' in content reads, but navigation must
      // land on the linked-list child, not the slot
      expect(host.getFirstDescendant()!.getKey()).toBe(bodyTextKey);
      expect(host.getLastDescendant()!.getKey()).toBe(bodyTextKey);
    });
  });

  test('editing slot content re-reconciles the slot in place (DOM + cache)', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let titleTextKey = '';

    editor.update(
      () => {
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
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      },
      {discrete: true},
    );

    // mutate text inside the slot subtree; the dirty must cross __slotHost
    // to dirty the host so its slot reconciles
    editor.update(
      () => {
        $getNodeByKey<TextNode>(titleTextKey)!.setTextContent('Header');
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    expect(
      hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
    ).toBe('Header');

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect(host.getTextContent()).toBe('HeaderBody');
      expect($getRoot().getTextContent()).toBe('HeaderBody');
    });
  });

  test('replacing a slot (same name, new node) swaps the rendered subtree', () => {
    using editor = createSlotEditor();
    let hostKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const oldTitle = $slotContainer('Old');
        $getRoot().append(host);
        $setSlot(host, 'title', oldTitle);
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        const newTitle = $slotContainer('New');
        $setSlot(host, 'title', newTitle);
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    // the existing container is reused, now holding the new subtree
    expect(
      hostDom.querySelector('[data-lexical-slot="title"]')!.textContent,
    ).toBe('New');

    editor.read(() => {
      expect($getRoot().getTextContent()).toBe('New');
    });
  });

  test('removing then re-adding a slot name reorders its container to match the Map', () => {
    using editor = createSlotEditor();
    let hostKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        $setSlot(host, 'a', $slotContainer('A'));
        $setSlot(host, 'b', $slotContainer('B'));
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        // Drop 'a' and re-add it: in the Map it now trails 'b'.
        $removeSlot(host, 'a');
        $setSlot(host, 'a', $slotContainer('A2'));
      },
      {discrete: true},
    );

    let modelOrder: string[] = [];
    editor.read(() => {
      modelOrder = $getSlotNames($getNodeByKey<ParagraphNode>(hostKey)!);
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

  test('suffix fast path keeps slot text when a slot and a suffix child are edited together', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let titleTextKey = '';
    const childTextKeys: string[] = [];

    // host with a 'title' slot and 5 linked-list children, enough to clear
    // MIN_FAST_PATH_CHILDREN (4) so the suffix-incremental fast path engages
    editor.update(
      () => {
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
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
        titleTextKey = titleText.getKey();
      },
      {discrete: true},
    );

    // single update: edit the slot text AND the last (suffix) child together
    editor.update(
      () => {
        $getNodeByKey<TextNode>(titleTextKey)!.setTextContent('Header');
        $getNodeByKey<TextNode>(childTextKeys[4])!.setTextContent('c4!');
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      // element walk is the slot-aware ground truth; the reconciler cache
      // (RootNode.__cachedText, read by root.getTextContent) must match it
      expect($getRoot().getTextContent()).toBe(host.getTextContent());
      // and the slot text must be the freshly edited value, slots-first
      expect(host.getTextContent().startsWith('Header')).toBe(true);
      expect(host.getTextContent()).toContain('c4!');
    });
  });

  test('suffix fast path keeps slot text when only a suffix child is edited', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    const childTextKeys: string[] = [];

    editor.update(
      () => {
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
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    // edit only a suffix child; the slot is untouched this cycle
    editor.update(
      () => {
        $getNodeByKey<TextNode>(childTextKeys[4])!.setTextContent('c4!');
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect($getRoot().getTextContent()).toBe(host.getTextContent());
      expect(host.getTextContent().startsWith('Title')).toBe(true);
    });
  });

  test('removing a slot drops its container and its text from the cache', () => {
    using editor = createSlotEditor();
    let hostKey = '';

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $slotContainer('Title');
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().append(host);
        host.append(body);
        $setSlot(host, 'title', title);
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        // no removeSlot API yet; delete from the writable slot map directly
        $getNodeByKey<ParagraphNode>(hostKey)!
          .getWritable()
          .__slots!.delete('title');
      },
      {discrete: true},
    );

    const hostDom = editor.getElementByKey(hostKey)!;
    expect(hostDom.querySelector('[data-lexical-slot="title"]')).toBe(null);

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect(host.getTextContent()).toBe('Body');
      expect($getRoot().getTextContent()).toBe('Body');
    });
  });

  test('removing the host last child keeps its slot containers in the DOM', () => {
    using editor = createSlotEditor();
    let childKey = '';
    let hostKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const child = $createTextNode('A');
        host.append(child);
        $setSlot(host, 'title', $slotContainer('TT'));
        $getRoot().append(host);
        childKey = child.getKey();
        hostKey = host.getKey();
      },
      {discrete: true},
    );

    editor.update(
      () => {
        $getNodeByKey<TextNode>(childKey)!.remove();
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect($getSlotNames(host)).toEqual(['title']);
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

  test('a document-wide RangeSelection carries slot text', () => {
    using editor = createSlotEditor();
    editor.update(
      () => {
        const before = $createParagraphNode().append($createTextNode('BEFORE'));
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        const after = $createParagraphNode().append($createTextNode('AFTER'));
        $getRoot().append(before, host, after);
        $setSlot(host, 'title', slot);
      },
      {discrete: true},
    );
    let text = '';
    editor.update(
      () => {
        const root = $getRoot();
        const sel = $createRangeSelection();
        sel.anchor.set(root.getKey(), 0, 'element');
        sel.focus.set(root.getKey(), root.getChildrenSize(), 'element');
        $setSelection(sel);
        text = sel.getTextContent();
      },
      {discrete: true},
    );
    expect(text).toContain('SLOTTEXT');
  });

  test('replace(includeChildren) carries slots onto the replacement', () => {
    using editor = createSlotEditor();
    let survived = false;
    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        const newHost = $createParagraphNode();
        host.replace(newHost, true);
        const got = $getSlot<TestShadowRootNode>(newHost, 'title');
        survived = got !== null && got.getTextContent() === 'SLOTTEXT';
      },
      {discrete: true},
    );
    expect(survived).toBe(true);
  });

  // Decorator hosts can't carry children (includeChildren stays false), so the
  // slot re-home must run independently of that gate; otherwise replacing a
  // decorator host orphans its slots. Fails before the re-home left the
  // includeChildren branch, passes after.
  test('replace carries slots onto a decorator host without includeChildren', () => {
    using editor = createSlotEditor();
    let survived = false;
    let oldHostAttached = true;
    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'media', slot);
        const newHost = $createTestDecoratorNode().setIsInline(false);
        host.replace(newHost);
        const got = $getSlot<TestShadowRootNode>(newHost, 'media');
        survived = got !== null && got.getTextContent() === 'SLOTTEXT';
        oldHostAttached = host.isAttached();
      },
      {discrete: true},
    );
    expect(survived).toBe(true);
    expect(oldHostAttached).toBe(false);
  });

  // Slots are a separate channel, so $destroyNode's child recursion doesn't
  // reach them. Removing a host must still clear its slot subtree from the
  // editor's DOM map (getElementByKey); otherwise those entries leak across
  // create/remove cycles. Fails before $destroyNode gained a slot branch.
  test('removing an element host clears its slot subtree from the DOM map', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let slotKey = '';
    let innerKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
        innerKey = slot.getFirstChildOrThrow().getKey();
      },
      {discrete: true},
    );
    expect(editor.getElementByKey(slotKey)).not.toBe(null);

    editor.update(
      () => {
        $getNodeByKey(hostKey)!.remove();
      },
      {discrete: true},
    );
    expect(editor.getElementByKey(slotKey)).toBe(null);
    expect(editor.getElementByKey(innerKey)).toBe(null);
  });

  test('removing a decorator host clears its slot subtree from the DOM map', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let slotKey = '';
    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'media', slot);
        hostKey = host.getKey();
        slotKey = slot.getKey();
      },
      {discrete: true},
    );
    expect(editor.getElementByKey(slotKey)).not.toBe(null);

    editor.update(
      () => {
        $getNodeByKey(hostKey)!.remove();
      },
      {discrete: true},
    );
    expect(editor.getElementByKey(slotKey)).toBe(null);
  });

  test('setSlot rejects a non-host at the type level', () => {
    // A TextNode is neither an element nor a decorator, so it does not satisfy
    // SlotHostNode. This call is never executed; it pins the compile-time
    // rejection that replaced the former runtime host-validity invariant.
    const $rejectNonHost = (text: TextNode, slot: TestShadowRootNode): void => {
      // @ts-expect-error - text is not a valid slot host
      $setSlot(text, 'title', slot);
    };
    expect($rejectNonHost).toBeInstanceOf(Function);
  });

  test('NodeSelection.insertNodes leaves a slotted node intact', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        slotKey = slot.getKey();
      },
      {discrete: true},
    );
    let caught: unknown = null;
    editor.update(
      () => {
        const ns = $createNodeSelection();
        ns.add(slotKey);
        $setSelection(ns);
        try {
          ns.insertNodes([$createParagraphNode()]);
        } catch (e) {
          caught = e;
        }
      },
      {discrete: true},
    );
    expect(caught).toBe(null);
    let survived = false;
    editor.read(() => {
      const host = $getRoot().getFirstChild() as ParagraphNode;
      const slot = $getSlot<TestShadowRootNode>(host, 'title');
      survived = slot !== null && slot.getTextContent() === 'SLOTTEXT';
    });
    expect(survived).toBe(true);
  });

  test('NodeSelection.deleteNodes leaves a slotted node intact', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $slotContainer('SLOTTEXT');
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        slotKey = slot.getKey();
      },
      {discrete: true},
    );
    let caught: unknown = null;
    editor.update(
      () => {
        const ns = $createNodeSelection();
        ns.add(slotKey);
        $setSelection(ns);
        try {
          ns.deleteNodes();
        } catch (e) {
          caught = e;
        }
      },
      {discrete: true},
    );
    expect(caught).toBe(null);
    let survived = false;
    editor.read(() => {
      const host = $getRoot().getFirstChild() as ParagraphNode;
      const slot = $getSlot<TestShadowRootNode>(host, 'title');
      survived = slot !== null && slot.getTextContent() === 'SLOTTEXT';
    });
    expect(survived).toBe(true);
  });

  test('removeText inside a slot stays scoped and does not walk past the slot boundary', () => {
    using editor = createSlotEditor();
    let textKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const slot = $createTestShadowRootNode();
        const para = $createParagraphNode();
        const text = $createTextNode('SLOTTEXT');
        para.append(text);
        slot.append(para);
        $getRoot().append(host);
        $setSlot(host, 'title', slot);
        textKey = text.getKey();
      },
      {discrete: true},
    );
    let caught: unknown = null;
    editor.update(
      () => {
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
      },
      {discrete: true},
    );
    expect(caught).toBe(null);
    let remaining = '';
    editor.read(() => {
      const host = $getRoot().getFirstChild() as ParagraphNode;
      remaining = $getSlot<TestShadowRootNode>(host, 'title')!.getTextContent();
    });
    expect(remaining).toBe('TEXT');
  });

  test('backspace at the start of a host child does not merge the slot-bearing host away', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let childKey = '';
    editor.update(
      () => {
        $getRoot().append(
          $createParagraphNode().append($createTextNode('AAA')),
        );
        const host = $createParagraphNode();
        $setSlot(host, 'title', $slotContainer('TITLE'));
        const child = $createTextNode('BBB');
        host.append(child);
        $getRoot().append(host);
        hostKey = host.getKey();
        childKey = child.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const sel = $createRangeSelection();
        sel.anchor.set(childKey, 0, 'text');
        sel.focus.set(childKey, 0, 'text');
        $setSelection(sel);
        sel.deleteCharacter(true);
      },
      {discrete: true},
    );
    editor.read(() => {
      // The host, its slot, and its child all survive: a slot-bearing host
      // is never merged away, since the merge would discard its slots.
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect($getRoot().getChildrenSize()).toBe(2);
      expect($getSlotNames(host)).toEqual(['title']);
      expect(
        $getSlot<TestShadowRootNode>(host, 'title')!.getTextContent(),
      ).toBe('TITLE');
      expect(host.getTextContent()).toBe('TITLEBBB');
      // The caret stays where it was rather than jumping into the prior block.
      const sel = $getSelection();
      assert($isRangeSelection(sel));
      expect(sel.anchor.key).toBe(childKey);
      expect(sel.anchor.offset).toBe(0);
    });
  });

  test('a slot added after initial render renders slots-first in the DOM', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        host.append($createParagraphNode().append($createTextNode('BODY')));
        $getRoot().append(host);
        hostKey = host.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const host = $getNodeByKey<ParagraphNode>(hostKey)!;
        $setSlot(host, 'title', $slotContainer('TITLE'));
      },
      {discrete: true},
    );
    const hostDom = editor.getElementByKey(hostKey)!;
    const order = Array.from(hostDom.children).map(child =>
      child.getAttribute('data-lexical-slot'),
    );
    // The slot container sits ahead of the body child, matching the
    // create-path order, rather than being appended after it.
    expect(order).toEqual(['title', null]);
  });

  test('getParentCaret stops at a slot value in every mode', () => {
    using editor = createSlotEditor();
    let slotKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        $setSlot(host, 'title', $slotContainer('TITLE'));
        slotKey = $getSlot(host, 'title')!.getKey();
      },
      {discrete: true},
    );

    editor.read(() => {
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

  test('child DOM index skips prepended slots in a coexistence host', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    let childAKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        const childA = $createParagraphNode().append($createTextNode('A'));
        const childB = $createParagraphNode().append($createTextNode('B'));
        $getRoot().append(host);
        host.append(childA, childB);
        $setSlot(host, 'title', $slotContainer('Title'));
        hostKey = host.getKey();
        childAKey = childA.getKey();
      },
      {discrete: true},
    );

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

  test('a childless slot host reports no managed first child', () => {
    using editor = createSlotEditor();
    let hostKey = '';
    editor.update(
      () => {
        const host = $createParagraphNode();
        $getRoot().append(host);
        $setSlot(host, 'title', $slotContainer('Title'));
        hostKey = host.getKey();
      },
      {discrete: true},
    );

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
        $setSlot(host, oddName, $slotContainer('Title'));
        hostKey = host.getKey();
      },
      {discrete: true},
    );
    const hostDomBefore = editor.getElementByKey(hostKey);

    // replace (same name, new node): hits the container lookup on reconcile
    editor.update(
      () => {
        $setSlot(
          $getNodeByKey<ParagraphNode>(hostKey)!,
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
        $removeSlot($getNodeByKey<ParagraphNode>(hostKey)!, oddName);
      },
      {discrete: true},
    );

    editor.read(() => {
      const host = $getNodeByKey<ParagraphNode>(hostKey)!;
      expect($getSlotNames(host)).toEqual([]);
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

  test('a slotted block decorator resolves like a normal block decorator (no throw, null RangeSelection)', () => {
    using editor = createSlotEditor();
    let slottedKey = '';
    let childKey = '';

    editor.update(
      () => {
        // host whose `media` slot holds a block decorator (Figure shape)
        const host = $createParagraphNode();
        const slotted = $createTestDecoratorNode().setIsInline(false);
        $setSlot(host, 'media', slotted);
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

// $createNode's cross-parent reuse guard checks prevNode.__parent !==
// node.__parent. A slot value has __parent === null in both states, so a
// cross-host slot move would bypass the reuse fast path on a __parent-only
// check and remount the DOM (orphaning portal state, losing decorator-internal
// state). These tests pin that the reuse path also covers slot moves
// (detected via __slotHost) and DOM-detached slot subtrees (host wrapper
// recreated via updateDOM=true).
describe('named-slots: cross-host slot move DOM reuse', () => {
  test('$removeSlot(A) + $setSlot(B, sameNode) in one update reuses the DOM', () => {
    using editor = createSlotEditor();
    let valueKey = '';
    let hostAKey = '';
    let hostBKey = '';

    editor.update(
      () => {
        const hostA = $createParagraphNode();
        const hostB = $createParagraphNode();
        const value = $slotContainer('Hello');
        $getRoot().append(hostA);
        $getRoot().append(hostB);
        $setSlot(hostA, 'media', value);
        hostAKey = hostA.getKey();
        hostBKey = hostB.getKey();
        valueKey = value.getKey();
      },
      {discrete: true},
    );

    const domBefore = editor.getElementByKey(valueKey);
    expect(domBefore).not.toBeNull();

    editor.update(
      () => {
        const hostA = $getNodeByKey<ParagraphNode>(hostAKey)!;
        const hostB = $getNodeByKey<ParagraphNode>(hostBKey)!;
        const value = $getNodeByKey<TestShadowRootNode>(valueKey)!;
        $removeSlot(hostA, 'media');
        $setSlot(hostB, 'media', value);
      },
      {discrete: true},
    );

    const domAfter = editor.getElementByKey(valueKey);
    expect(domAfter).not.toBeNull();
    // domAfter === domBefore — DOM reused, just re-parented. Without the
    // slot-host case in the reuse guard, the DOM would be remounted.
    expect(domAfter).toBe(domBefore);
  });

  test('host updateDOM=true preserves slot subtree DOM', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().clear();
        },
        name: '[h-1b]',
        nodes: [TestShadowRootNode, TestUpdateDOMTrueHostNode],
      }),
    );
    const root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.appendChild(root);
    mountedRoots.push(root);
    editor.setRootElement(root);

    let hostKey = '';
    let valueKey = '';
    editor.update(
      () => {
        const host = new TestUpdateDOMTrueHostNode();
        const value = $slotContainer('Hello');
        $getRoot().append(host);
        $setSlot(host, 'media', value);
        hostKey = host.getKey();
        valueKey = value.getKey();
      },
      {discrete: true},
    );

    const domBefore = editor.getElementByKey(valueKey);
    expect(domBefore).not.toBeNull();

    editor.update(
      () => {
        const host = $getNodeByKey<TestUpdateDOMTrueHostNode>(hostKey)!;
        host.setToggle(host.__toggle + 1);
      },
      {discrete: true},
    );

    const domAfter = editor.getElementByKey(valueKey);
    expect(domAfter).not.toBeNull();
    // Host wrapper DOM recreated (updateDOM=true) but slot subtree DOM
    // reused, so domAfter === domBefore (decorator portal state survives).
    // Without the DOM-detached case in the reuse guard, the slot subtree
    // would be remounted.
    expect(domAfter).toBe(domBefore);
  });
});
