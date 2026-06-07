/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Provider} from '../../index';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isTextNode,
  createEditor,
  type LexicalEditor,
} from 'lexical';
import {
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from 'lexical/src/__tests__/utils';
import {afterEach, assert, describe, expect, test} from 'vitest';
import {
  applyUpdate,
  Doc,
  encodeStateAsUpdate,
  Map as YMap,
  type Text as YText,
  XmlText,
  type YEvent,
} from 'yjs';

import {createBinding} from '../../Bindings';
import {CollabDecoratorNode} from '../../CollabDecoratorNode';
import {CollabElementNode} from '../../CollabElementNode';
import {
  syncLexicalUpdateToYjs,
  syncYjsChangesToLexical,
} from '../../SyncEditorStates';

// V1 (stable, CollabElementNode): serialize a lexical tree with a named slot
// into the V1 yjs representation (the slot lands in a dedicated `slots`
// attribute Y.Map on the host's `_xmlText`, separate from the linked-list
// children embedded in the same `_xmlText`), restore it into a fresh editor,
// and drive the observer (remote-change) path for a slot add / delete / in-slot
// text edit through the real syncYjsChangesToLexical entry point.
describe('named-slots collab-v1: lexical <-> yjs', () => {
  const editors: LexicalEditor[] = [];
  afterEach(() => {
    editors.length = 0;
  });

  function buildBinding() {
    const editor = createEditor({
      namespace: 'slot-sync-v1',
      nodes: [TestShadowRootNode],
      onError: e => {
        throw e;
      },
    });
    editors.push(editor);
    const doc = new Doc();
    const docMap = new Map<string, Doc>([['slot-sync-v1', doc]]);
    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'slot-sync-v1',
      doc,
      docMap,
    );
    return {binding, doc, editor};
  }

  // A second editor + binding over a *separate* doc seeded from the source
  // doc's update. V1 caches the local CollabNode on the shared yjs type
  // (`sharedType._collabNode`), so a real second client must own a distinct Doc
  // synced via update messages (as the existing collab tests do) rather than
  // share the in-process Doc, otherwise the restore reuses the serializer's
  // collab nodes and double-applies their children.
  function buildRestoreBinding(doc: Doc) {
    const editor = createEditor({
      namespace: 'slot-sync-v1',
      nodes: [TestShadowRootNode],
      onError: e => {
        throw e;
      },
    });
    editors.push(editor);
    const docMap = new Map<string, Doc>([['slot-sync-v1', doc]]);
    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'slot-sync-v1',
      doc,
      docMap,
    );
    return {binding, editor};
  }

  function serialize(
    editor: LexicalEditor,
    binding: ReturnType<typeof createBinding>,
  ) {
    editor.read(() => {
      binding.doc.transact(() => {
        binding.root.syncChildrenFromLexical(
          binding,
          $getRoot(),
          null,
          null,
          null,
        );
      });
    });
  }

  // Restore the whole shared root into a fresh editor: build the root collab
  // children from the embedded delta, then materialize lexical nodes (and
  // slots) via syncChildrenFromYjs. Mirrors the V1 observer's root YTextEvent
  // handling (applyChildrenYjsDelta + syncChildrenFromYjs).
  function restore(
    editor: LexicalEditor,
    binding: ReturnType<typeof createBinding>,
  ) {
    editor.update(
      () => {
        $getRoot().clear();
        binding.root.applyChildrenYjsDelta(
          binding,
          binding.root._xmlText.toDelta(),
        );
        binding.root.syncChildrenFromYjs(binding);
      },
      {discrete: true},
    );
  }

  test('a host with a "title" slot serializes the slot into a `slots` Y.Map', () => {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().clear().append(host);
        host.append(body);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert('_xmlText' in hostCollab);
    const hostXmlText = hostCollab._xmlText as XmlText;

    // the slot lives in the dedicated `slots` attribute channel, not children.
    const slotsY = hostXmlText.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);
    expect(Array.from(slotsY.keys())).toEqual(['title']);

    // the slot's shared type is the title paragraph's `_xmlText`. In V1 a text
    // child is embedded as a CollabTextNode YMap marker followed by its text,
    // so the raw `toString()` carries the `[object Object]` embed marker before
    // the text itself.
    const titleY = slotsY.get('title');
    assert(titleY instanceof XmlText);
    expect(titleY.toString()).toContain('Title');
  });

  test('a host with no slots sets no `slots` attribute', () => {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createParagraphNode();
        host.append($createTextNode('plain'));
        $getRoot().clear().append(host);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert('_xmlText' in hostCollab);
    const hostXmlText = hostCollab._xmlText as XmlText;
    expect(hostXmlText.getAttribute('slots')).toBeUndefined();
  });

  // Serialize a host with a 'title' slot + 'Body' child into doc, then restore
  // it into a second client (separate doc2). Returns the restored binding /
  // editor plus the host collab node and its slots Y.Map on doc2.
  function setupRestoredSlotTree() {
    const {binding, doc, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().clear().append(host);
        host.append(body);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const doc2 = new Doc();
    applyUpdate(doc2, encodeStateAsUpdate(doc));

    const {binding: binding2, editor: editor2} = buildRestoreBinding(doc2);
    restore(editor2, binding2);

    const hostCollab = binding2.root._children[0];
    assert(hostCollab instanceof CollabElementNode);
    const slotsY = hostCollab._xmlText.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);

    return {binding2, doc2, editor2, hostCollab, slotsY};
  }

  test('round-trip: a serialized slot restores into a fresh editor', () => {
    const {editor2} = setupRestoredSlotTree();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isElementNode(hostR));
      // the linked-list child survives the round-trip
      expect(hostR.getTextContent()).toContain('Body');

      const titleR = hostR.getSlot('title');
      assert(titleR != null);
      assert($isElementNode(titleR));
      expect(titleR.getTextContent()).toBe('Title');
      // the restored slot is shadow-rooted: no parent in the children tree
      expect(titleR.getParent()).toBe(null);
    });
  });

  // Drive the real V1 observer entry point: observeDeep on the shared root
  // captures the YEvent[] produced by `mutate`, then `syncYjsChangesToLexical`
  // runs them through $syncEvent (the same path useYjsCollaboration registers).
  // The cursor-sync fn is a no-op because this test has no provider/awareness.
  function applyRemoteChange(
    binding: ReturnType<typeof createBinding>,
    mutate: () => void,
  ) {
    const sharedRoot = binding.root.getSharedType();
    const handler = (events: YEvent<YText>[]) => {
      syncYjsChangesToLexical(
        binding,
        null as unknown as Provider,
        events,
        false,
        () => undefined,
      );
    };
    sharedRoot.observeDeep(handler);
    try {
      mutate();
    } finally {
      sharedRoot.unobserveDeep(handler);
    }
  }

  // syncYjsChangesToLexical commits its editor.update non-discretely, so the
  // new committed state lands on a microtask. Drain before reading.
  async function flush() {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // observer (c): a remote slot delete arrives as a YMapEvent on the host's
  // slots Y.Map. The new $syncEvent slots branch re-routes it to the host's
  // syncSlotsFromYjs diff, which drops the lexical slot whose name is gone.
  test('observer: a remote slot delete removes the slot from the host', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        slotsY.delete('title');
      });
    });
    await flush();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isElementNode(hostR));
      expect(hostR.getSlotNames()).toEqual([]);
      expect(hostR.getSlot('title')).toBe(null);
      // the linked-list child is untouched by the slot removal
      expect(hostR.getTextContent()).toContain('Body');
    });
  });

  // observer (a): a remote slot add arrives as a YMapEvent on the slots Y.Map;
  // the slots branch re-reconciles the host, keeping 'title' and adding the new
  // slot. V1 has no per-slot serialize path yet to fill a freshly-added slot's
  // text, so this fabricates an empty shadow-root slot type (text-fill of a new
  // slot is out of scope; in-slot text edits are covered by observer (b)).
  test('observer: a remote slot add reconciles into the host', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        const sub = new XmlText();
        sub.setAttribute('__type', 'test_shadow_root');
        slotsY.set('subtitle', sub);
      });
    });
    await flush();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isElementNode(hostR));
      expect(hostR.getSlotNames().sort()).toEqual(['subtitle', 'title']);
      expect(hostR.getSlot('title')?.getTextContent()).toBe('Title');
      const subR = hostR.getSlot('subtitle');
      assert(subR != null);
      assert($isElementNode(subR));
      expect(subR.getParent()).toBe(null);
    });
  });

  // observer (b): a text edit inside a slot arrives as a YTextEvent whose target
  // is the slot's own XmlText (its cached _collabNode is the slot's
  // CollabElementNode), so the existing CollabElementNode + YTextEvent branch
  // re-parses the slot's children in place — no slots-branch involvement.
  test('observer: editing text inside a slot updates the slot in place', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();
    const titleY = slotsY.get('title');
    assert(titleY instanceof XmlText);
    // the slot is a shadow root; its only child is the paragraph that holds the
    // text, embedded as its own XmlText. The text lives one level down, so the
    // edit targets the paragraph's XmlText, not the slot container's.
    const paraY = titleY.toDelta()[0].insert;
    assert(paraY instanceof XmlText);

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        // append '!!' after the existing 'Title' text run (offset 0 is the
        // CollabTextNode embed marker, so the text ends at paraY.length).
        paraY.insert(paraY.length, '!!');
      });
    });
    await flush();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isElementNode(hostR));
      const titleR = hostR.getSlot('title');
      assert(titleR != null);
      assert($isElementNode(titleR));
      expect(titleR.getTextContent()).toBe('Title!!');
      expect(titleR.getParent()).toBe(null);
    });
  });

  // Build a host with a 'title' slot + 'Body' child in a single editor and run
  // the initial full serialization (creation path seeds the slots Y.Map). The
  // returned hostCollab + its slots Y.Map are the local serializer's own collab
  // tree (not a restore), so subsequent local edits diff against it.
  function setupLocalSlotTree() {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createParagraphNode();
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        const body = $createParagraphNode();
        body.append($createTextNode('Body'));
        $getRoot().clear().append(host);
        host.append(body);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert(hostCollab instanceof CollabElementNode);
    return {binding, editor, hostCollab};
  }

  // Drive the real local (lexical -> yjs) update path: register the same update
  // listener useYjsCollaboration registers, run a discrete edit, then let
  // syncLexicalUpdateToYjs diff the dirty tree into yjs. The provider is unused
  // (no awareness in this test).
  function applyLocalUpdate(
    binding: ReturnType<typeof createBinding>,
    editor: LexicalEditor,
    mutate: () => void,
  ) {
    // syncLexicalUpdateToYjs ends with a selection sync that reads
    // provider.awareness; a local state of null short-circuits it.
    const provider = {
      awareness: {getLocalState: () => null},
    } as unknown as Provider;
    const removeListener = editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) => {
        syncLexicalUpdateToYjs(
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
    try {
      editor.update(mutate, {discrete: true});
    } finally {
      removeListener();
    }
  }

  // local (a): a slot added to an already-serialized host. The host child is
  // matched (same key) in the children diff, so _syncChildFromLexical recurses
  // into syncSlotsFromLexical, which creates the new slot's shared type and
  // sets it on the host's slots Y.Map.
  test('local: a slot added to an existing host serializes into the slots Y.Map', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const subtitle = $createTestShadowRootNode();
      subtitle.append($createParagraphNode().append($createTextNode('Sub')));
      host.setSlot('subtitle', subtitle);
    });

    const slotsY = hostCollab._xmlText.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);
    expect(Array.from(slotsY.keys()).sort()).toEqual(['subtitle', 'title']);
    const subY = slotsY.get('subtitle');
    assert(subY instanceof XmlText);
    expect(subY.toString()).toContain('Sub');
  });

  // local (b): a text edit inside a slot. The slot node key is unchanged, so
  // syncSlotsFromLexical recurses content-sync in place — the slot's existing
  // XmlText object is reused (identity preserved) and its text is updated, not
  // recreated.
  test('local: editing text inside a slot updates the slot shared type in place', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();
    const slotsY = hostCollab._xmlText.getAttribute('slots') as YMap<unknown>;
    const titleYBefore = slotsY.get('title');

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const title = host.getSlot('title');
      assert($isElementNode(title));
      const para = title.getFirstChild();
      assert($isElementNode(para));
      const text = para.getFirstChild();
      assert($isTextNode(text));
      text.setTextContent('Title!!');
    });

    const titleYAfter = slotsY.get('title');
    // same shared type object: edited in place, not recreated
    expect(titleYAfter).toBe(titleYBefore);
    assert(titleYAfter instanceof XmlText);
    expect(titleYAfter.toString()).toContain('Title!!');
  });

  // local (c): a slot removed from the host. syncSlotsFromLexical's delete loop
  // drops the name gone from lexical out of the slots Y.Map.
  test('local: removing a slot deletes it from the slots Y.Map', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      host.removeSlot('title');
    });

    const slotsY = hostCollab._xmlText.getAttribute('slots') as unknown;
    if (slotsY instanceof YMap) {
      expect(Array.from(slotsY.keys())).toEqual([]);
    }
  });

  // local (e): removing a slot must also destroy its collab node, mirroring the
  // children-removal path (splice -> destroy). Otherwise the slot's
  // CollabElementNode dangles in binding.collabNodeMap after the slot is gone.
  test('local: removing a slot clears its collab node from the map', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();

    let slotKey = '';
    editor.read(() => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const title = host.getSlot('title');
      assert(title != null);
      slotKey = title.__key;
    });
    expect(binding.collabNodeMap.has(slotKey)).toBe(true);

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      host.removeSlot('title');
    });

    const slotsY = hostCollab._xmlText.getAttribute('slots') as unknown;
    if (slotsY instanceof YMap) {
      expect(Array.from(slotsY.keys())).toEqual([]);
    }
    expect(binding.collabNodeMap.has(slotKey)).toBe(false);
  });

  // local (f): replacing a slot with a new value under the same name keeps the
  // name in lexical, so the removal loop never runs. The create branch must
  // still destroy the departing value's collab node before overwriting its
  // Y.Map entry, or the old node dangles in binding.collabNodeMap.
  test('local: replacing a slot under the same name clears the old collab node', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();

    let oldKey = '';
    editor.read(() => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const title = host.getSlot('title');
      assert(title != null);
      oldKey = title.__key;
    });
    expect(binding.collabNodeMap.has(oldKey)).toBe(true);

    let newKey = '';
    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const next = $createTestShadowRootNode();
      next.append($createParagraphNode().append($createTextNode('NewTitle')));
      host.setSlot('title', next);
      newKey = next.__key;
    });

    expect(binding.collabNodeMap.has(oldKey)).toBe(false);
    expect(binding.collabNodeMap.has(newKey)).toBe(true);
    const slotsY = hostCollab._xmlText.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);
    expect(Array.from(slotsY.keys())).toEqual(['title']);
    const titleY = slotsY.get('title');
    assert(titleY instanceof XmlText);
    expect(titleY.toString()).toContain('NewTitle');
  });

  // local (g): removing the whole host must also destroy its slot collab node.
  // The host leaves via the children splice -> destroy path, not
  // syncSlotsFromLexical, so destroy() itself has to reach the slot — otherwise
  // the slot's CollabElementNode dangles in binding.collabNodeMap after the host
  // is gone.
  test('local: removing the host clears its slot collab node from the map', () => {
    const {binding, editor} = setupLocalSlotTree();

    let slotKey = '';
    let hostKey = '';
    editor.read(() => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      hostKey = host.__key;
      const title = host.getSlot('title');
      assert(title != null);
      slotKey = title.__key;
    });
    expect(binding.collabNodeMap.has(slotKey)).toBe(true);
    expect(binding.collabNodeMap.has(hostKey)).toBe(true);

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      host.remove();
    });

    expect(binding.collabNodeMap.has(hostKey)).toBe(false);
    expect(binding.collabNodeMap.has(slotKey)).toBe(false);
  });

  // observer (d): a remote slot delete must likewise destroy the slot's collab
  // node so it doesn't dangle in binding.collabNodeMap on the remote client.
  test('observer: a remote slot delete clears its collab node from the map', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();

    let slotKey = '';
    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isElementNode(hostR));
      const title = hostR.getSlot('title');
      assert(title != null);
      slotKey = title.__key;
    });
    expect(binding2.collabNodeMap.has(slotKey)).toBe(true);

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        slotsY.delete('title');
      });
    });
    await flush();

    expect(binding2.collabNodeMap.has(slotKey)).toBe(false);
  });

  // local (d): the diff (not whole-recreate) evidence. An unrelated child edit
  // re-syncs the host, but the untouched 'title' slot keeps the same XmlText
  // object identity — syncSlotsFromLexical recursed it in place rather than
  // recreating and re-setting it.
  test('local: an unrelated host edit leaves an untouched slot identical', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();
    const slotsY = hostCollab._xmlText.getAttribute('slots') as YMap<unknown>;
    const titleYBefore = slotsY.get('title');

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isElementNode(host));
      const body = host.getFirstChild();
      assert($isElementNode(body));
      const text = body.getFirstChild();
      assert($isTextNode(text));
      text.setTextContent('Body changed');
    });

    const titleYAfter = slotsY.get('title');
    expect(titleYAfter).toBe(titleYBefore);
    assert(titleYAfter instanceof XmlText);
    expect(titleYAfter.toString()).toContain('Title');
  });
});

// V1 with a DECORATOR host. A non-inline decorator can host named slots even
// though it has no linked-list children channel: its CollabDecoratorNode stores
// the slots Y.Map on its `_xmlElem` (XmlElement) rather than an element host's
// `_xmlText`. These mirror the element-host cases above through the same real
// entry points (serialize, restore, observer, local update), exercising the
// decorator-specific create-seed / restore / re-route / destroy paths.
describe('named-slots collab-v1: decorator host <-> yjs', () => {
  const editors: LexicalEditor[] = [];
  afterEach(() => {
    editors.length = 0;
  });

  function buildBinding() {
    const editor = createEditor({
      namespace: 'slot-sync-v1',
      nodes: [TestShadowRootNode, TestDecoratorNode],
      onError: e => {
        throw e;
      },
    });
    editors.push(editor);
    const doc = new Doc();
    const docMap = new Map<string, Doc>([['slot-sync-v1', doc]]);
    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'slot-sync-v1',
      doc,
      docMap,
    );
    return {binding, doc, editor};
  }

  function buildRestoreBinding(doc: Doc) {
    const editor = createEditor({
      namespace: 'slot-sync-v1',
      nodes: [TestShadowRootNode, TestDecoratorNode],
      onError: e => {
        throw e;
      },
    });
    editors.push(editor);
    const docMap = new Map<string, Doc>([['slot-sync-v1', doc]]);
    const binding = createBinding(
      editor,
      null as unknown as Provider,
      'slot-sync-v1',
      doc,
      docMap,
    );
    return {binding, editor};
  }

  function serialize(
    editor: LexicalEditor,
    binding: ReturnType<typeof createBinding>,
  ) {
    editor.read(() => {
      binding.doc.transact(() => {
        binding.root.syncChildrenFromLexical(
          binding,
          $getRoot(),
          null,
          null,
          null,
        );
      });
    });
  }

  function restore(
    editor: LexicalEditor,
    binding: ReturnType<typeof createBinding>,
  ) {
    editor.update(
      () => {
        $getRoot().clear();
        binding.root.applyChildrenYjsDelta(
          binding,
          binding.root._xmlText.toDelta(),
        );
        binding.root.syncChildrenFromYjs(binding);
      },
      {discrete: true},
    );
  }

  function applyRemoteChange(
    binding: ReturnType<typeof createBinding>,
    mutate: () => void,
  ) {
    const sharedRoot = binding.root.getSharedType();
    const handler = (events: YEvent<YText>[]) => {
      syncYjsChangesToLexical(
        binding,
        null as unknown as Provider,
        events,
        false,
        () => undefined,
      );
    };
    sharedRoot.observeDeep(handler);
    try {
      mutate();
    } finally {
      sharedRoot.unobserveDeep(handler);
    }
  }

  async function flush() {
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  function applyLocalUpdate(
    binding: ReturnType<typeof createBinding>,
    editor: LexicalEditor,
    mutate: () => void,
  ) {
    const provider = {
      awareness: {getLocalState: () => null},
    } as unknown as Provider;
    const removeListener = editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) => {
        syncLexicalUpdateToYjs(
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
    try {
      editor.update(mutate, {discrete: true});
    } finally {
      removeListener();
    }
  }

  test('a decorator host with a "title" slot seeds the slots Y.Map on `_xmlElem`', () => {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        $getRoot().clear().append(host);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert(hostCollab instanceof CollabDecoratorNode);
    // a decorator host stores its slots on `_xmlElem`, not a `_xmlText` channel.
    const slotsY = hostCollab._xmlElem.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);
    expect(Array.from(slotsY.keys())).toEqual(['title']);

    const titleY = slotsY.get('title');
    assert(titleY instanceof XmlText);
    expect(titleY.toString()).toContain('Title');
  });

  test('a decorator host with no slots sets no `slots` attribute', () => {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        $getRoot().clear().append(host);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert(hostCollab instanceof CollabDecoratorNode);
    expect(hostCollab._xmlElem.getAttribute('slots')).toBeUndefined();
  });

  function setupRestoredSlotTree() {
    const {binding, doc, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        $getRoot().clear().append(host);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const doc2 = new Doc();
    applyUpdate(doc2, encodeStateAsUpdate(doc));

    const {binding: binding2, editor: editor2} = buildRestoreBinding(doc2);
    restore(editor2, binding2);

    const hostCollab = binding2.root._children[0];
    assert(hostCollab instanceof CollabDecoratorNode);
    const slotsY = hostCollab._xmlElem.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);

    return {binding2, doc2, editor2, hostCollab, slotsY};
  }

  test('round-trip: a serialized decorator-host slot restores into a fresh editor', () => {
    const {editor2} = setupRestoredSlotTree();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isDecoratorNode(hostR));
      const titleR = hostR.getSlot('title');
      assert(titleR != null);
      assert($isElementNode(titleR));
      expect(titleR.getTextContent()).toBe('Title');
      // the restored slot is shadow-rooted: no parent in the children tree
      expect(titleR.getParent()).toBe(null);
    });
  });

  test('observer: a remote slot delete removes the slot from the decorator host', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();

    let slotKey = '';
    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isDecoratorNode(hostR));
      const title = hostR.getSlot('title');
      assert(title != null);
      slotKey = title.__key;
    });
    expect(binding2.collabNodeMap.has(slotKey)).toBe(true);

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        slotsY.delete('title');
      });
    });
    await flush();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isDecoratorNode(hostR));
      expect(hostR.getSlotNames()).toEqual([]);
      expect(hostR.getSlot('title')).toBe(null);
    });
    // the slot's collab node must not dangle in the map after removal
    expect(binding2.collabNodeMap.has(slotKey)).toBe(false);
  });

  test('observer: editing text inside a decorator-host slot updates it in place', async () => {
    const {binding2, doc2, editor2, slotsY} = setupRestoredSlotTree();
    const titleY = slotsY.get('title');
    assert(titleY instanceof XmlText);
    const paraY = titleY.toDelta()[0].insert;
    assert(paraY instanceof XmlText);

    applyRemoteChange(binding2, () => {
      doc2.transact(() => {
        paraY.insert(paraY.length, '!!');
      });
    });
    await flush();

    editor2.read(() => {
      const hostR = $getRoot().getFirstChild();
      assert($isDecoratorNode(hostR));
      const titleR = hostR.getSlot('title');
      assert(titleR != null);
      assert($isElementNode(titleR));
      expect(titleR.getTextContent()).toBe('Title!!');
      expect(titleR.getParent()).toBe(null);
    });
  });

  function setupLocalSlotTree() {
    const {binding, editor} = buildBinding();

    editor.update(
      () => {
        const host = $createTestDecoratorNode().setIsInline(false);
        const title = $createTestShadowRootNode();
        title.append($createParagraphNode().append($createTextNode('Title')));
        $getRoot().clear().append(host);
        host.setSlot('title', title);
      },
      {discrete: true},
    );

    serialize(editor, binding);

    const hostCollab = binding.root._children[0];
    assert(hostCollab instanceof CollabDecoratorNode);
    return {binding, editor, hostCollab};
  }

  test('local: a slot added to an existing decorator host serializes into the slots Y.Map', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isDecoratorNode(host));
      const subtitle = $createTestShadowRootNode();
      subtitle.append($createParagraphNode().append($createTextNode('Sub')));
      host.setSlot('subtitle', subtitle);
    });

    const slotsY = hostCollab._xmlElem.getAttribute('slots') as unknown;
    assert(slotsY instanceof YMap);
    expect(Array.from(slotsY.keys()).sort()).toEqual(['subtitle', 'title']);
    const subY = slotsY.get('subtitle');
    assert(subY instanceof XmlText);
    expect(subY.toString()).toContain('Sub');
  });

  test('local: editing text inside a decorator-host slot updates the shared type in place', () => {
    const {binding, editor, hostCollab} = setupLocalSlotTree();
    const slotsY = hostCollab._xmlElem.getAttribute(
      'slots',
    ) as unknown as YMap<unknown>;
    const titleYBefore = slotsY.get('title');

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isDecoratorNode(host));
      const title = host.getSlot('title');
      assert($isElementNode(title));
      const para = title.getFirstChild();
      assert($isElementNode(para));
      const text = para.getFirstChild();
      assert($isTextNode(text));
      text.setTextContent('Title!!');
    });

    const titleYAfter = slotsY.get('title');
    // same shared type object: edited in place, not recreated
    expect(titleYAfter).toBe(titleYBefore);
    assert(titleYAfter instanceof XmlText);
    expect(titleYAfter.toString()).toContain('Title!!');
  });

  test('local: removing the decorator host clears its slot collab node from the map', () => {
    const {binding, editor} = setupLocalSlotTree();

    let slotKey = '';
    let hostKey = '';
    editor.read(() => {
      const host = $getRoot().getFirstChild();
      assert($isDecoratorNode(host));
      hostKey = host.__key;
      const title = host.getSlot('title');
      assert(title != null);
      slotKey = title.__key;
    });
    expect(binding.collabNodeMap.has(slotKey)).toBe(true);
    expect(binding.collabNodeMap.has(hostKey)).toBe(true);

    applyLocalUpdate(binding, editor, () => {
      const host = $getRoot().getFirstChild();
      assert($isDecoratorNode(host));
      host.remove();
    });

    expect(binding.collabNodeMap.has(hostKey)).toBe(false);
    expect(binding.collabNodeMap.has(slotKey)).toBe(false);
  });
});
