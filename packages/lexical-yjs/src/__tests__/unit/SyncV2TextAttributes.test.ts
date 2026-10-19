/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getState,
  $isTextNode,
  $setSelection,
  $setState,
  createEditor,
  createState,
  type ElementNode,
  type LexicalEditor,
  type StateConfig,
  type TextFormatType,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';
import {
  applyUpdate as yApplyUpdate,
  ContentFormat,
  decodeUpdate,
  Doc,
  Item,
  UndoManager,
  type XmlElement,
  type XmlText,
  type YEvent,
} from 'yjs';

// Collab v2 syncs the format, style and NodeState of the TextNodes of a
// paragraph as Y.XmlText attributes. A local edit must only write the
// attributes that changed: re-asserting the unchanged ones replaces their
// format items, and the replacements resurrect or extend attributes that a
// concurrent peer removed.

type MarkState = StateConfig<string, boolean>;
const c1: MarkState = createState('mark:c1', {parse: v => v === true});
const c2: MarkState = createState('mark:c2', {parse: v => v === true});

const NETWORK = Symbol('network');

/**
 * - `relay`: every update goes through one server that forwards them in the
 *   order it received them, so each peer receives updates in causal order.
 * - `per-sender`: each sender's updates arrive in order, but updates from
 *   different senders are not ordered against each other, so a peer can
 *   receive a reaction to an update before the update itself (Yjs holds the
 *   parts it cannot integrate yet as pending).
 */
type Delivery = 'relay' | 'per-sender';

class Peer {
  doc: Doc;
  editor: LexicalEditor;
  binding: BindingV2;
  /** This peer's own updates, in order */
  log: Uint8Array[] = [];
  sent = 0;
  relayIndex = 0;
  received = new Map<Peer, number>();
  online = true;

  constructor(clientID: number) {
    this.doc = new Doc({gc: false});
    this.doc.clientID = clientID;
    this.editor = createEditor({
      onError: error => {
        throw error;
      },
    });
    const awarenessStates = new Map<number, unknown>();
    const provider = {
      awareness: {
        getLocalState: () => awarenessStates.get(clientID) ?? null,
        getStates: () => awarenessStates,
        off() {},
        on() {},
        setLocalState: (state: unknown) => awarenessStates.set(clientID, state),
        setLocalStateField() {},
      },
      connect() {},
      disconnect() {},
      off() {},
      on() {},
    } as unknown as Provider;
    const binding = createBindingV2__EXPERIMENTAL(
      this.editor,
      'main',
      this.doc,
      new Map([['main', this.doc]]),
    );
    this.binding = binding;
    binding.root.observeDeep((events, transaction) => {
      if (transaction.origin !== binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          binding,
          provider,
          events as YEvent<never>[],
          transaction,
          transaction.origin instanceof UndoManager,
        );
      }
    });
    this.editor.registerUpdateListener(
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
    this.doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== NETWORK) {
        this.log.push(update);
      }
    });
  }

  update(fn: () => void) {
    this.editor.update(fn, {discrete: true});
  }
}

class Network {
  relayLog: {from: Peer; update: Uint8Array}[] = [];
  constructor(
    readonly peers: Peer[],
    readonly delivery: Delivery,
  ) {}

  /** Deliver until every online peer has every update */
  flush() {
    let progress = true;
    while (progress) {
      progress = false;
      for (const peer of this.peers) {
        if (!peer.online) {
          continue;
        }
        if (this.delivery === 'relay') {
          while (peer.sent < peer.log.length) {
            this.relayLog.push({from: peer, update: peer.log[peer.sent++]});
            progress = true;
          }
          while (peer.relayIndex < this.relayLog.length) {
            const {from, update} = this.relayLog[peer.relayIndex++];
            if (from !== peer) {
              yApplyUpdate(peer.doc, update, NETWORK);
              progress = true;
            }
          }
        } else {
          for (const sender of this.peers) {
            if (sender === peer || !sender.online) {
              continue;
            }
            let index = peer.received.get(sender) ?? 0;
            while (index < sender.log.length) {
              yApplyUpdate(peer.doc, sender.log[index++], NETWORK);
              peer.received.set(sender, index);
              progress = true;
            }
          }
        }
      }
    }
  }
}

const TEXT = 'Revenue grew by 4% in Q3.';

function $paragraph(): ElementNode {
  return $getRoot().getFirstChildOrThrow<ElementNode>();
}

function $locate(offset: number, preferNext: boolean): [TextNode, number] {
  let acc = 0;
  const texts = $paragraph().getAllTextNodes();
  for (let i = 0; i < texts.length; i++) {
    const size = texts[i].getTextContentSize();
    if (
      offset < acc + size ||
      (offset === acc + size && (!preferNext || i === texts.length - 1))
    ) {
      return [texts[i], offset - acc];
    }
    acc += size;
  }
  throw new Error(`offset ${offset} out of range`);
}

function $select(start: number, end = start) {
  const [startNode, startOffset] = $locate(start, start !== end);
  const [endNode, endOffset] = $locate(end, false);
  const selection = $createRangeSelection();
  selection.anchor.set(startNode.getKey(), startOffset, 'text');
  selection.focus.set(endNode.getKey(), endOffset, 'text');
  $setSelection(selection);
  return selection;
}

/** Type like a user would: the inserted text takes the caret node's format */
function $type(offset: number, text: string) {
  const selection = $select(offset);
  const node = selection.anchor.getNode() as TextNode;
  selection.format = node.getFormat();
  selection.style = node.getStyle();
  selection.insertText(text);
}

function $setFormat(
  start: number,
  end: number,
  format: TextFormatType,
  value: boolean,
) {
  for (const node of $select(start, end).extract()) {
    if ($isTextNode(node) && node.hasFormat(format) !== value) {
      node.toggleFormat(format);
    }
  }
}

function $setMark(state: MarkState, start: number, end: number) {
  for (const node of $select(start, end).extract()) {
    if ($isTextNode(node)) {
      $setState(node, state, true);
    }
  }
}

function $removeMark(state: MarkState) {
  for (const node of $getRoot().getAllTextNodes()) {
    if ($getState(node, state)) {
      $setState(node, state, false);
    }
  }
}

/** The paragraph's runs, e.g. `"grew"[c1,i]`, with c1/c2 marks and b/i/u formats */
function describeRuns(peer: Peer): string {
  return peer.editor.read(() =>
    $paragraph()
      .getChildren()
      .map(node => {
        if (!$isTextNode(node)) {
          return node.getType();
        }
        const tags = [
          $getState(node, c1) && 'c1',
          $getState(node, c2) && 'c2',
          node.hasFormat('bold') && 'b',
          node.hasFormat('italic') && 'i',
          node.hasFormat('underline') && 'u',
        ].filter(Boolean);
        return (
          JSON.stringify(node.getTextContent()) +
          (tags.length > 0 ? `[${tags.join(',')}]` : '')
        );
      })
      .join(' '),
  );
}

function setup(clientIDs: number[], delivery: Delivery, $init: () => void) {
  const peers = clientIDs.map(id => new Peer(id));
  const network = new Network(peers, delivery);
  peers[0].update(() => {
    $getRoot()
      .clear()
      .append($createParagraphNode().append($createTextNode(TEXT)));
    $init();
  });
  network.flush();
  return {
    offline() {
      peers.forEach(peer => (peer.online = false));
    },
    peers,
    sync() {
      peers.forEach(peer => (peer.online = true));
      network.flush();
    },
  };
}

function expectConverged(peers: Peer[], expected: string) {
  for (const peer of peers) {
    expect(describeRuns(peer)).toBe(expected);
    expect(peer.doc.toJSON()).toEqual(peers[0].doc.toJSON());
  }
}

/** Every client id order: Yjs breaks ties between concurrent items by client id */
const CLIENT_ID_ORDERS = [
  [1, 2, 3],
  [1, 3, 2],
  [2, 1, 3],
  [2, 3, 1],
  [3, 1, 2],
  [3, 2, 1],
];

describe.each(['relay', 'per-sender'] as const)(
  'Collab v2 text attributes, three peers, %s delivery',
  delivery => {
    // The NodeState races only go wrong when a peer can receive a reaction to
    // an update before the update itself, so with relay delivery they are
    // controls: they pass with and without the fix.
    const control =
      delivery === 'relay' ? ' (control, also passes without the fix)' : '';
    describe.each(CLIENT_ID_ORDERS)('client ids A=%i B=%i C=%i', (...ids) => {
      // "grew by 4%" is c1, " by 4% in " is c2
      const $initMarks = () => {
        $setMark(c1, 8, 18);
        $setMark(c2, 12, 22);
      };
      // "grew by 4%" is italic, " by 4% in " is bold
      const $initFormats = () => {
        $setFormat(8, 18, 'italic', true);
        $setFormat(12, 22, 'bold', true);
      };

      test(`NodeState key removed while peers type inside it and at the start${control}`, () => {
        const {peers, offline, sync} = setup(ids, delivery, $initMarks);
        const [a, b, c] = peers;
        offline();
        a.update(() => $removeMark(c1));
        b.update(() => $type(14, 'XX'));
        c.update(() => $type(0, 'Z'));
        sync();
        expectConverged(peers, '"ZRevenue grew" " bXXy 4% in "[c2] "Q3."');
      });

      test(`NodeState key removed while peers type inside it and bold the start${control}`, () => {
        const {peers, offline, sync} = setup(ids, delivery, $initMarks);
        const [a, b, c] = peers;
        offline();
        a.update(() => $removeMark(c1));
        b.update(() => $type(14, 'XX'));
        c.update(() => $setFormat(0, 7, 'bold', true));
        sync();
        expectConverged(peers, '"Revenue"[b] " grew" " bXXy 4% in "[c2] "Q3."');
      });

      test('format removed while peers type inside it and at the start', () => {
        const {peers, offline, sync} = setup(ids, delivery, $initFormats);
        const [a, b, c] = peers;
        offline();
        a.update(() => $setFormat(8, 18, 'italic', false));
        b.update(() => $type(14, 'XX'));
        c.update(() => $type(0, 'Z'));
        sync();
        expectConverged(peers, '"ZRevenue grew" " bXXy 4% in "[b] "Q3."');
      });

      test('format removed while peers type inside it and underline the start', () => {
        const {peers, offline, sync} = setup(ids, delivery, $initFormats);
        const [a, b, c] = peers;
        offline();
        a.update(() => $setFormat(8, 18, 'italic', false));
        b.update(() => $type(14, 'XX'));
        c.update(() => $setFormat(0, 7, 'underline', true));
        sync();
        expectConverged(peers, '"Revenue"[u] " grew" " bXXy 4% in "[b] "Q3."');
      });
    });
  },
);

describe('Collab v2 text attributes, local edits', () => {
  function formatKeysWrittenBy(peer: Peer, $edit: () => void): string[] {
    const before = peer.log.length;
    peer.update($edit);
    const keys: string[] = [];
    for (const update of peer.log.slice(before)) {
      for (const struct of decodeUpdate(update).structs) {
        if (struct instanceof Item && struct.content instanceof ContentFormat) {
          keys.push(struct.content.key);
        }
      }
    }
    return keys;
  }

  test('typing does not rewrite the attributes of any run', () => {
    const {peers} = setup([1], 'relay', () => {
      $setMark(c1, 8, 18);
      $setFormat(12, 22, 'bold', true);
    });
    expect(formatKeysWrittenBy(peers[0], () => $type(0, 'Z'))).toEqual([]);
    expect(formatKeysWrittenBy(peers[0], () => $type(15, 'XX'))).toEqual([]);
    expect(describeRuns(peers[0])).toBe(
      '"ZRevenue " "grew"[c1] " bXXy 4%"[c1,b] " in "[b] "Q3."',
    );
  });

  test('formatting a run writes only the keys that change', () => {
    const {peers} = setup([1], 'relay', () => {
      $setMark(c1, 8, 18);
      $setMark(c2, 12, 22);
    });
    const keys = formatKeysWrittenBy(peers[0], () =>
      $setFormat(0, 7, 'bold', true),
    );
    // The new run shifts the run index of the runs after it, but no NodeState
    // key is written again
    expect(new Set(keys)).toEqual(new Set(['p', 'i']));
    expect(describeRuns(peers[0])).toBe(
      '"Revenue"[b] " " "grew"[c1] " by 4%"[c1,c2] " in "[c2] "Q3."',
    );
  });
});

describe('Collab v2 text attributes, keys from other writers', () => {
  test('a key the binding does not own survives an edit elsewhere in the paragraph', () => {
    const {peers, sync} = setup([1, 2], 'relay', () =>
      $setFormat(12, 22, 'bold', true),
    );
    const [a, b] = peers;
    // A peer on a newer version tags " by 4%" with a key this binding does
    // not know
    const ytext = (a.binding.root.get(0) as XmlElement).get(0) as XmlText;
    a.doc.transact(() => ytext.format(12, 6, {future: 1}), 'newer peer');
    sync();
    b.update(() => $type(0, 'Z'));
    sync();
    for (const peer of peers) {
      const paragraph = peer.binding.root.get(0) as XmlElement;
      const tagged = (paragraph.get(0) as XmlText)
        .toDelta()
        .filter(
          (op: {attributes?: Record<string, unknown>}) =>
            op.attributes !== undefined && op.attributes.future === 1,
        )
        .map((op: {insert: string}) => op.insert)
        .join('');
      expect(tagged).toBe(' by 4%');
      expect(describeRuns(peer)).toBe('"ZRevenue grew" " by 4% in "[b] "Q3."');
    }
  });
});
