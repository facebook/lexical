/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  buildEditorFromExtensions,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $isElementNode,
  $isTextNode,
  $setSlot,
  defineExtension,
  ElementNode,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestShadowRootNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, assert, describe, expect, test} from 'vitest';
import {applyUpdate, Doc, Map as YMap, XmlElement, XmlText} from 'yjs';

import {SLOTS_ATTR_KEY} from '../../Utils';

// Two collab-v2 peers wired like useYjsCollaborationV2 (observeDeep for remote
// changes, an update listener for local ones) over a synchronous in-memory
// transport. Unlike SlotSyncV2.test.ts, remote changes reach each peer through
// the real observer path, so a peer's mapping is in whatever state applying a
// remote change leaves it in.

class SlotHostNode extends ElementNode {
  $config() {
    return this.config('slot_peers_host', {
      extends: ElementNode,
      slots: ['caption'],
    });
  }
  createDOM(): HTMLElement {
    return document.createElement('div');
  }
  updateDOM(): boolean {
    return false;
  }
}

const RELAY = {relay: true};

type Peer = {
  binding: BindingV2;
  doc: Doc;
  editor: LexicalEditorWithDispose;
};

describe('named-slots collab-v2: two peers', () => {
  const editors: LexicalEditorWithDispose[] = [];
  afterEach(() => {
    for (const editor of editors) {
      editor.dispose();
    }
    editors.length = 0;
  });

  function createPeer(): Peer {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: '[slot-sync-v2-peers]',
        nodes: [SlotHostNode, TestShadowRootNode],
      }),
    );
    editors.push(editor);
    const doc = new Doc();
    const binding = createBindingV2__EXPERIMENTAL(
      editor,
      'main',
      doc,
      new Map([['main', doc]]),
    );
    const provider = {
      awareness: {
        getLocalState: () => null,
        getStates: () => new Map(),
        off() {},
        on() {},
        setLocalState() {},
        setLocalStateField() {},
      },
    } as unknown as Provider;
    binding.root.observeDeep((events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events,
          transaction,
          false,
        );
      }
    });
    editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) => {
        syncLexicalUpdateToYjsV2__EXPERIMENTAL(
          binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        );
      },
    );
    return {binding, doc, editor};
  }

  function connect(a: Peer, b: Peer) {
    for (const [from, to] of [
      [a, b],
      [b, a],
    ]) {
      from.doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== RELAY) {
          applyUpdate(to.doc, update, RELAY);
          // Commit the (non-discrete) editor update scheduled by the observer.
          to.editor.read(() => {});
        }
      });
    }
  }

  function $captionParagraph() {
    const host = $getRoot()
      .getChildren()
      .find(n => n instanceof SlotHostNode);
    assert(host instanceof SlotHostNode);
    const caption = $getSlot(host, 'caption');
    assert($isElementNode(caption));
    const paragraph = caption.getFirstChild();
    assert($isElementNode(paragraph));
    return paragraph;
  }

  function readCaption(editor: LexicalEditor) {
    return editor.read(() => $captionParagraph().getTextContent());
  }

  function yjsCaption(binding: BindingV2) {
    const hostY = binding.root
      .toArray()
      .find(
        (t): t is XmlElement =>
          t instanceof XmlElement && t.nodeName === 'slot_peers_host',
      );
    assert(hostY !== undefined);
    const slotsY = hostY.getAttribute(SLOTS_ATTR_KEY) as unknown;
    assert(slotsY instanceof YMap);
    const captionY = slotsY.get('caption');
    assert(captionY instanceof XmlElement);
    const paragraphY = captionY.toArray()[0];
    assert(paragraphY instanceof XmlElement);
    const textY = paragraphY.toArray()[0];
    assert(textY instanceof XmlText);
    return textY.toString();
  }

  function setup() {
    const a = createPeer();
    const b = createPeer();
    connect(a, b);
    a.editor.update(
      () => {
        const host = new SlotHostNode();
        host.append($createParagraphNode().append($createTextNode('body')));
        const caption = $createTestShadowRootNode();
        caption.append(
          $createParagraphNode().append($createTextNode('cap text')),
        );
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode('alpha beta')),
            host,
            $createParagraphNode().append($createTextNode('gamma')),
          );
        $setSlot(host, 'caption', caption);
      },
      {discrete: true},
    );
    expect(readCaption(b.editor)).toBe('cap text');
    return {a, b};
  }

  function $typeInCaption(offset: number, text: string) {
    const textNode = $captionParagraph().getFirstChild();
    assert($isTextNode(textNode));
    textNode.spliceText(offset, 0, text);
  }

  const SIBLING_CHANGES: [string, () => void][] = [
    [
      'a paragraph inserted right before the host',
      () => {
        const host = $getRoot()
          .getChildren()
          .find(n => n instanceof SlotHostNode);
        assert(host !== undefined);
        host.insertBefore(
          $createParagraphNode().append($createTextNode('new')),
        );
      },
    ],
    [
      'a paragraph inserted right after the host',
      () => {
        const host = $getRoot()
          .getChildren()
          .find(n => n instanceof SlotHostNode);
        assert(host !== undefined);
        host.insertAfter($createParagraphNode().append($createTextNode('new')));
      },
    ],
    [
      "the host's previous sibling removed",
      () => {
        $getRoot().getFirstChildOrThrow().remove();
      },
    ],
  ];

  for (const [name, $changeSibling] of SIBLING_CHANGES) {
    test(`a slot edit after a remote change of ${name} is written to yjs`, () => {
      const {a, b} = setup();

      a.editor.update($changeSibling, {discrete: true});
      expect(b.editor.read(() => $getRoot().getTextContent())).toBe(
        a.editor.read(() => $getRoot().getTextContent()),
      );

      // B's first edit inside the slot, with no concurrency.
      b.editor.update(() => $typeInCaption(0, 'Y'), {discrete: true});

      expect(readCaption(b.editor)).toBe('Ycap text');
      // Written to B's own yjs doc...
      expect(yjsCaption(b.binding)).toBe('Ycap text');
      // ...and therefore delivered to A.
      expect(yjsCaption(a.binding)).toBe('Ycap text');
      expect(readCaption(a.editor)).toBe('Ycap text');
    });
  }

  test('a slot edit with an unchanged host sibling list is written to yjs (control)', () => {
    const {a, b} = setup();

    a.editor.update(() => $typeInCaption(3, 'X'), {discrete: true});
    expect(readCaption(b.editor)).toBe('capX text');

    b.editor.update(() => $typeInCaption(0, 'Y'), {discrete: true});
    expect(yjsCaption(b.binding)).toBe('YcapX text');
    expect(readCaption(a.editor)).toBe('YcapX text');
  });
});
