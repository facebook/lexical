/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$createCodeNode, CodeHighlightNode, CodeNode} from '@lexical/code';
import {$toggleLink, AutoLinkNode, LinkNode} from '@lexical/link';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $createHeadingNode,
  $createQuoteNode,
  HeadingNode,
  QuoteNode,
} from '@lexical/rich-text';
import {$setBlocksType} from '@lexical/selection';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {
  $getAnchorAndFocusForUserState,
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  createUndoManager,
  getInlineFormatLayoutState__EXPERIMENTAL,
  initializeInlineFormatLayout__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
  syncYjsStateToLexicalV2__EXPERIMENTAL,
  type UserState,
} from '@lexical/yjs';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  $setState,
  createEditor,
  createState,
  DecoratorNode,
  ElementNode,
  type LexicalEditor,
  type LexicalNode,
  nodeSchema,
  ParagraphNode,
  type SerializedEditorState,
  type SerializedParagraphNode,
  stringValue,
  type TextNode,
  withField,
} from 'lexical';
import {
  $createTestDecoratorNode,
  $createTestInlineElementNode,
  TestDecoratorNode,
  TestInlineElementNode,
} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';
import * as Y from 'yjs';

import {syncLexicalSelectionToYjs} from '../../SyncCursors';
import {LAYOUT_MAP_NAME} from '../../SyncV2';
import {MARKER_CHAR} from '../../SyncV2Blocks';

// A block the block-marker layout knows nothing about ('node'): stored as an
// embedded element whose own children (paragraphs) are a flow.
const calloutSchema = nodeSchema<CalloutNode>()({
  tone: withField(stringValue(), {field: '__tone'}),
});
class CalloutNode extends ElementNode {
  __tone: string = '';
  $config() {
    return this.config('test_callout', {
      extends: ElementNode,
      json: calloutSchema,
    });
  }
  getTone(): string {
    return this.getLatest().__tone;
  }
  setTone(tone: string): this {
    const self = this.getWritable();
    self.__tone = tone;
    return self;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}
const $createCalloutNode = (tone = '') => $create(CalloutNode).setTone(tone);

// A block decorator.
class WidgetNode extends DecoratorNode<null> {
  $config() {
    return this.config('test_widget', {extends: DecoratorNode});
  }
  isInline(): false {
    return false;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): false {
    return false;
  }
  decorate(): null {
    return null;
  }
}

const blockState = createState('blockState', {
  parse: v => (typeof v === 'string' ? v : ''),
});

const NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  CodeNode,
  CodeHighlightNode,
  CalloutNode,
  TestDecoratorNode,
  TestInlineElementNode,
  WidgetNode,
];

// Delivery: 'causal' relays every update through one FIFO queue; 'sender'
// keeps each sender's updates in order but delivers the senders' queues in
// reverse id order, so a peer can receive an update before one it depends on
// (Yjs holds it until the dependency arrives).
type Delivery = 'causal' | 'sender';

type Network = {
  peers: Peer[];
  delivery: Delivery;
  queue: [Peer, Uint8Array][];
  pumping: boolean;
};

function pump(net: Network) {
  if (net.pumping) {
    return;
  }
  net.pumping = true;
  try {
    for (let next = net.queue.shift(); next; next = net.queue.shift()) {
      Y.applyUpdate(next[0].doc, next[1], net);
    }
  } finally {
    net.pumping = false;
  }
}

function createProvider(): Provider {
  const awareness = {
    getLocalState: () => awareness.state,
    getStates: () => new Map<number, UserState>(),
    off: () => {},
    on: () => {},
    setLocalState: (state: UserState | null) => {
      awareness.state = state;
    },
    setLocalStateField: (field: string, value: unknown) => {
      if (awareness.state !== null) {
        awareness.state = {...awareness.state, [field]: value};
      }
    },
    state: {
      anchorPos: null,
      awarenessData: {},
      color: '#000',
      focusPos: null,
      focusing: true,
      name: 'test',
    } as UserState | null,
  };
  return {
    awareness,
    connect: () => {},
    disconnect: () => {},
    off: () => {},
    on: () => {},
  } as unknown as Provider;
}

class Peer {
  readonly doc: Y.Doc;
  readonly editor: LexicalEditor;
  readonly binding: BindingV2;
  readonly provider: Provider;
  readonly undoManager: Y.UndoManager;
  online = true;
  /** Updates not yet delivered, per sender. */
  pending = new Map<Peer, Uint8Array[]>();
  warnings: Error[] = [];

  constructor(
    clientID: number,
    readonly net: Network,
    blockMarkers: boolean,
  ) {
    this.doc = new Y.Doc({gc: false});
    this.doc.clientID = clientID;
    this.editor = createEditor({
      namespace: 'test',
      nodes: NODES,
      onError: e => {
        throw e;
      },
      onWarn: e => {
        this.warnings.push(e);
      },
    });
    this.provider = createProvider();
    this.binding = createBindingV2__EXPERIMENTAL(
      this.editor,
      'main',
      this.doc,
      new Map([['main', this.doc]]),
      {blockMarkers},
    );
    this.undoManager = createUndoManager(this.binding, this.binding.root);
    this.binding.root.observeDeep((events, transaction) => {
      if (transaction.origin !== this.binding) {
        syncYjsChangesToLexicalV2__EXPERIMENTAL(
          this.binding,
          this.provider,
          events as Y.YEvent<Y.XmlElement | Y.XmlText>[],
          transaction,
          transaction.origin instanceof Y.UndoManager,
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
          this.binding,
          this.provider,
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
      if (origin === this.net) {
        return;
      }
      for (const peer of this.net.peers) {
        if (peer === this) {
          continue;
        }
        if (this.online && peer.online && this.net.delivery === 'causal') {
          this.net.queue.push([peer, update]);
        } else {
          const list = peer.pending.get(this) || [];
          list.push(update);
          peer.pending.set(this, list);
        }
      }
      pump(this.net);
    });
    net.peers.push(this);
  }

  update(fn: () => void) {
    this.undoManager.stopCapturing();
    this.editor.update(fn, {discrete: true});
  }

  read<T>(fn: () => T): T {
    return this.editor.getEditorState().read(fn);
  }

  describe(): string {
    return this.read(() =>
      $getRoot().getChildren().map(describeNode).join(' / '),
    );
  }

  json(): SerializedEditorState {
    return this.editor.getEditorState().toJSON();
  }
}

function describeNode(node: LexicalNode): string {
  if ($isTextNode(node)) {
    const format = node.getFormat();
    return (
      JSON.stringify(node.getTextContent()) + (format ? `{${format}}` : '')
    );
  }
  if ($isLineBreakNode(node)) {
    return 'br';
  }
  if (!$isElementNode(node)) {
    return node.getType();
  }
  let label = node.getType();
  if (node instanceof HeadingNode) {
    label += `[${node.getTag()}]`;
  } else if ($isListNode(node)) {
    label += `[${node.getListType()}${node.getStart() !== 1 ? ',' + node.getStart() : ''}]`;
  } else if (node instanceof LinkNode) {
    label += `<${node.getURL()}>`;
  } else if (node instanceof CalloutNode && node.getTone() !== '') {
    label += `[${node.getTone()}]`;
  }
  if ($isListItemNode(node) && node.getChecked() !== undefined) {
    label += node.getChecked() ? '[x]' : '[ ]';
  }
  return `${label}(${node.getChildren().map(describeNode).join(' ')})`;
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

type Setup = {
  a: Peer;
  b: Peer;
  c: Peer;
  peers: Peer[];
  offline: () => void;
  sync: () => Promise<void>;
};

async function setup(
  init: () => void,
  options: {ids?: number[]; delivery?: Delivery; blockMarkers?: boolean} = {},
): Promise<Setup> {
  const net: Network = {
    delivery: 'causal',
    peers: [],
    pumping: false,
    queue: [],
  };
  const ids = options.ids ?? [1, 2];
  const peers = ids.map(id => new Peer(id, net, options.blockMarkers ?? true));
  const [a] = peers;
  initializeInlineFormatLayout__EXPERIMENTAL(a.binding);
  a.update(() => {
    $getRoot().clear();
    init();
  });
  await flush();
  for (const peer of peers) {
    peer.undoManager.clear();
  }
  net.delivery = options.delivery ?? 'causal';
  const sync = async () => {
    for (const peer of peers) {
      peer.online = true;
    }
    if (net.delivery === 'causal') {
      // Each sender's pending updates, merged, in id order.
      for (const sender of peers) {
        for (const receiver of peers) {
          const list = receiver.pending.get(sender);
          if (list !== undefined && list.length > 0) {
            receiver.pending.delete(sender);
            net.queue.push([receiver, Y.mergeUpdates(list)]);
          }
        }
      }
      pump(net);
    } else {
      // Per sender, in order, but senders in reverse order and one update at
      // a time.
      for (const sender of [...peers].reverse()) {
        for (const receiver of peers) {
          const list = receiver.pending.get(sender) || [];
          receiver.pending.delete(sender);
          for (const update of list) {
            net.queue.push([receiver, update]);
            pump(net);
          }
        }
      }
    }
    await flush();
    // Anything written while delivering (reactions) is delivered too.
    for (let round = 0; round < 3; round++) {
      let more = false;
      for (const receiver of peers) {
        for (const [, list] of receiver.pending) {
          if (list.length > 0) {
            more = true;
          }
        }
      }
      if (!more) {
        break;
      }
      for (const sender of peers) {
        for (const receiver of peers) {
          const list = receiver.pending.get(sender);
          if (list !== undefined && list.length > 0) {
            receiver.pending.delete(sender);
            net.queue.push([receiver, Y.mergeUpdates(list)]);
          }
        }
      }
      pump(net);
      await flush();
    }
  };
  return {
    a,
    b: peers[1],
    c: peers[2],
    offline() {
      for (const peer of peers) {
        peer.online = false;
      }
    },
    peers,
    sync,
  };
}

/** A fresh client reading the whole document. */
async function freshReader(from: Peer): Promise<Peer> {
  const net: Network = {
    delivery: 'causal',
    peers: [],
    pumping: false,
    queue: [],
  };
  const peer = new Peer(99, net, false);
  Y.applyUpdate(peer.doc, Y.encodeStateAsUpdate(from.doc), net);
  syncYjsStateToLexicalV2__EXPERIMENTAL(peer.binding, peer.provider);
  await flush();
  return peer;
}

/** Without keys, so two editors' states compare. */
function shape(peer: Peer): unknown {
  return peer.json();
}

async function expectConverged(peers: Peer[], expected?: string) {
  const first = peers[0];
  for (const peer of peers) {
    expect(peer.describe()).toBe(first.describe());
    // Canonical shape: the same tree, not only the same text.
    expect(shape(peer)).toEqual(shape(first));
    expect(getInlineFormatLayoutState__EXPERIMENTAL(peer.binding)).toBe(
      'blocks',
    );
  }
  const fresh = await freshReader(first);
  expect(fresh.describe()).toBe(first.describe());
  expect(shape(fresh)).toEqual(shape(first));
  if (expected !== undefined) {
    expect(first.describe()).toBe(expected);
  }
  // One flow per container: the root holds a single XmlText.
  const rootChildren = first.binding.root.toArray();
  expect(rootChildren.length).toBe(1);
  expect(rootChildren[0]).toBeInstanceOf(Y.XmlText);
}

// Selection helpers over the text of one block (found by a path of child
// indexes from the root).
function $block(path: number[]): ElementNode {
  let node: LexicalNode = $getRoot();
  for (const i of path) {
    node = (node as ElementNode).getChildAtIndex(i)!;
  }
  return node as ElementNode;
}

function $locateIn(block: ElementNode, offset: number): [TextNode, number] {
  const texts = block.getAllTextNodes();
  let acc = 0;
  for (let i = 0; i < texts.length; i++) {
    const size = texts[i].getTextContentSize();
    if (
      offset < acc + size ||
      (offset === acc + size && i === texts.length - 1)
    ) {
      return [texts[i], offset - acc];
    }
    acc += size;
  }
  throw new Error(`offset ${offset} out of range`);
}

function $selectIn(path: number[], start: number, end: number = start) {
  const block = $block(path);
  const [startNode, startOffset] = $locateIn(block, start);
  const [endNode, endOffset] = $locateIn(block, end);
  const selection = $createRangeSelection();
  selection.anchor.set(startNode.getKey(), startOffset, 'text');
  selection.focus.set(endNode.getKey(), endOffset, 'text');
  $setSelection(selection);
  return selection;
}

const $p = (text: string) =>
  $createParagraphNode().append($createTextNode(text));
const $li = (text: string) =>
  $createListItemNode().append($createTextNode(text));

const P = 'Revenue grew 4% in Q3.';

// Both id orders of two peers, and three peers in the orders that matter.
const ORDERS: {name: string; ids: number[]; delivery: Delivery}[] = [
  {delivery: 'causal', ids: [1, 2], name: 'ids 1,2 causal'},
  {delivery: 'causal', ids: [2, 1], name: 'ids 2,1 causal'},
  {delivery: 'sender', ids: [1, 2], name: 'ids 1,2 per-sender'},
  {delivery: 'sender', ids: [2, 1], name: 'ids 2,1 per-sender'},
  {delivery: 'causal', ids: [1, 2, 3], name: 'three peers 1,2,3 causal'},
  {delivery: 'sender', ids: [3, 2, 1], name: 'three peers 3,2,1 per-sender'},
];

describe.each(ORDERS)('block-marker layout, $name', ({ids, delivery}) => {
  const opts = {delivery, ids};

  test('split ‖ type in the tail', async () => {
    const t = await setup(() => $getRoot().append($p(P)), opts);
    t.offline();
    t.a.update(() => $selectIn([0], 8).insertParagraph());
    t.b.update(() => $selectIn([0], 15).insertText('X'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("Revenue ") / paragraph("grew 4%X in Q3.")',
    );
  });

  test('join ‖ type', async () => {
    const t = await setup(
      () => $getRoot().append($p('Hello'), $p('World')),
      opts,
    );
    t.offline();
    t.a.update(() => $selectIn([1], 0).deleteCharacter(true));
    t.b.update(() => $selectIn([1], 5).insertText('!'));
    await t.sync();
    await expectConverged(t.peers, 'paragraph("HelloWorld!")');
  });

  test('heading ‖ type', async () => {
    const t = await setup(() => $getRoot().append($p(P)), opts);
    t.offline();
    t.a.update(() =>
      $setBlocksType($selectIn([0], 0), () => $createHeadingNode('h2')),
    );
    t.b.update(() => $selectIn([0], 14).insertText('.5'));
    await t.sync();
    await expectConverged(t.peers, 'heading[h2]("Revenue grew 4.5% in Q3.")');
  });

  test('quote ‖ type', async () => {
    const t = await setup(() => $getRoot().append($p(P)), opts);
    t.offline();
    t.a.update(() =>
      $setBlocksType($selectIn([0], 0), () => $createQuoteNode()),
    );
    t.b.update(() => $selectIn([0], 22).insertText('!'));
    await t.sync();
    await expectConverged(t.peers, 'quote("Revenue grew 4% in Q3.!")');
  });

  test('list indent ‖ type', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append($li('one'), $li('two')),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => ($block([0, 1]) as ListItemNode).setIndent(1));
    t.b.update(() => $selectIn([0, 1], 3).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'list[bullet](listitem("one") listitem(list[bullet](listitem("two!"))))',
    );
  });

  test('list type change ‖ type', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append($li('one'), $li('two')),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => ($block([0]) as ListNode).setListType('number'));
    t.b.update(() => $selectIn([0, 0], 3).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'list[number](listitem("one!") listitem("two"))',
    );
  });

  test('Enter inside a list item ‖ type', async () => {
    const t = await setup(
      () => $getRoot().append($createListNode('bullet').append($li('one two'))),
      opts,
    );
    t.offline();
    t.a.update(() => $selectIn([0, 0], 4).insertParagraph());
    t.b.update(() => $selectIn([0, 0], 7).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'list[bullet](listitem("one ") listitem("two!"))',
    );
  });

  test('link ‖ type (inline formats)', async () => {
    const t = await setup(() => $getRoot().append($p(P)), opts);
    t.offline();
    t.a.update(() => {
      $selectIn([0], 8, 15);
      $toggleLink('https://x');
    });
    t.b.update(() => $selectIn([0], 13).insertText('by '));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("Revenue " link<https://x>("grew by 4%") " in Q3.")',
    );
  });

  test('table cell paragraphs (nested container) ‖ type', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createTableNode().append(
            $createTableRowNode().append(
              $createTableCellNode().append($p('cell one')),
              $createTableCellNode().append($p('cell two')),
            ),
          ),
          $p('after'),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => $selectIn([0, 0, 0, 0], 4).insertParagraph());
    t.b.update(() => $selectIn([0, 0, 0, 0], 8).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'table(tablerow(tablecell(paragraph("cell") paragraph(" one!")) tablecell(paragraph("cell two")))) / paragraph("after")',
    );
  });

  test('undeclared custom block ‖ type', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createCalloutNode('info').append($p('Note this'), $p('and this')),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => {
      $selectIn([0, 0], 4).insertParagraph();
      ($block([0]) as CalloutNode).setTone('warn');
    });
    t.b.update(() => $selectIn([0, 0], 9).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'test_callout[warn](paragraph("Note") paragraph(" this!") paragraph("and this"))',
    );
  });
});

const ORDERS3: {name: string; ids: number[]; delivery: Delivery}[] = [
  {delivery: 'causal', ids: [1, 2, 3], name: 'ids 1,2,3 causal'},
  {delivery: 'causal', ids: [3, 1, 2], name: 'ids 3,1,2 causal'},
  {delivery: 'sender', ids: [1, 2, 3], name: 'ids 1,2,3 per-sender'},
  {delivery: 'sender', ids: [3, 2, 1], name: 'ids 3,2,1 per-sender'},
];

// Removing a line deletes exactly its characters and marker: lines that
// share letters with it, and concurrent edits to its neighbours, are kept.
describe.each(ORDERS3)('block-marker layout, removals, $name', opts => {
  const $nested = (text: string) =>
    $createListItemNode().append($createListNode('bullet').append($li(text)));

  test('remove a line ‖ clear the next line', async () => {
    const t = await setup(
      () => $getRoot().append($p('alpha'), $p('beta'), $p('bravo')),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.c.update(() => $selectIn([2], 0, 5).removeText());
    await t.sync();
    await expectConverged(t.peers, 'paragraph("alpha") / paragraph()');
  });

  test('remove a list item ‖ clear the next item', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('one'),
            $li('two'),
            $li('three'),
          ),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => $block([0, 1]).remove());
    t.c.update(() => $selectIn([0, 2], 0, 5).removeText());
    await t.sync();
    await expectConverged(t.peers, 'list[bullet](listitem("one") listitem())');
  });

  test('remove a line ‖ type after the first character of the next', async () => {
    const t = await setup(
      () => $getRoot().append($p('alpha'), $p('beta'), $p('bravo')),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.c.update(() => $selectIn([2], 1).insertText('#C#'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("alpha") / paragraph("b#C#ravo")',
    );
  });

  test('remove a line ‖ bold the first character of the next', async () => {
    const t = await setup(
      () => $getRoot().append($p('alpha'), $p('beta'), $p('bravo')),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.c.update(() => $selectIn([2], 0, 1).formatText('bold'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("alpha") / paragraph("b"{1} "ravo")',
    );
  });

  test('remove an empty line ‖ type in the next empty line ‖ retype the title', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $p('Title'),
          $createParagraphNode(),
          $createParagraphNode(),
          $p('y'),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.b.update(() => $block([2]).selectStart().insertText('#B#'));
    t.c.update(() =>
      $setBlocksType($selectIn([0], 0), () => $createHeadingNode('h3')),
    );
    await t.sync();
    await expectConverged(
      t.peers,
      'heading[h3]("Title") / paragraph("#B#") / paragraph("y")',
    );
  });

  test('remove a duplicate line ‖ quote the next line', async () => {
    const t = await setup(
      () => $getRoot().append($p('same'), $p('same'), $p('same')),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.b.update(() =>
      $setBlocksType($selectIn([2], 0), () => $createQuoteNode()),
    );
    await t.sync();
    await expectConverged(t.peers, 'paragraph("same") / quote("same")');
  });

  test('typing into a line a peer removed joins the next line', async () => {
    // A documented limit: the removed line's marker is gone, so what was
    // typed into it belongs to the next marker.
    const t = await setup(
      () => $getRoot().append($p('keep'), $p('gone'), $p('next')),
      opts,
    );
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.b.update(() => $selectIn([1], 2).insertText('#B#'));
    await t.sync();
    await expectConverged(t.peers, 'paragraph("keep") / paragraph("#B#next")');
  });

  test('outdent ‖ indent of one item leaves its neighbours alone', async () => {
    const t = await setup(
      () =>
        $getRoot().append(
          $createListNode('bullet').append(
            $li('one'),
            $nested('two'),
            $li('three'),
          ),
        ),
      opts,
    );
    t.offline();
    t.a.update(() => ($block([0, 1, 0, 0]) as ListItemNode).setIndent(0));
    t.b.update(() => ($block([0, 1, 0, 0]) as ListItemNode).setIndent(2));
    await t.sync();
    await expectConverged(t.peers);
    // "three" was not edited: it stays at the top level.
    expect(
      t.a.read(() => {
        const list = $block([0]);
        const last = list.getLastChild() as ListItemNode;
        return [last.getTextContent(), last.getIndent()];
      }),
    ).toEqual(['three', 0]);
  });
});

describe('block-marker layout, randomized intent checks', () => {
  // Lines carry unique tokens. After every round: every peer, and a fresh
  // reader, show the same tree; no Lexical text holds U+2029; the tokens of
  // removed lines are gone; and a line whose type was set by one peer, with
  // no other structural change to it in that round, keeps that type.
  const tokens = ['Ka1', 'Lb2', 'Mc3', 'Nd4', 'Oe5', 'Pf6', 'Qg7', 'Rh8'];
  test.each(Array.from({length: 40}, (_, i) => i + 1))(
    'seed %i',
    async seed => {
      let x = seed * 2654435761;
      const rnd = () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
      };
      const useList = seed % 3 === 0;
      const lines = tokens.slice(0, 4 + (seed % 4));
      const t = await setup(
        () =>
          $getRoot().append(
            ...(useList
              ? [
                  $createListNode('bullet').append(
                    ...lines.map(w => $li(`ab ${w} ab`)),
                  ),
                ]
              : lines.map(w => $p(`ab ${w} ab`))),
          ),
        {delivery: seed % 2 === 0 ? 'causal' : 'sender', ids: [1, 2, 3]},
      );
      const removed = new Set<string>();
      for (let round = 0; round < 3; round++) {
        t.offline();
        const typed = new Map<string, {peer: number; type: string}>();
        const structural = new Map<string, number>();
        for (const peer of t.peers) {
          const n = 1 + Math.floor(rnd() * 2);
          for (let k = 0; k < n; k++) {
            const r = rnd();
            const r2 = rnd();
            peer.update(() => {
              const container = useList ? $block([0]) : $getRoot();
              const count = container.getChildrenSize();
              if (count === 0) {
                return;
              }
              const i = Math.floor(r2 * count);
              const line = container.getChildAtIndex(i) as ElementNode;
              if (
                !(line instanceof ElementNode) ||
                !line
                  .getChildren()
                  .every(c => !(c instanceof ElementNode) || c.isInline())
              ) {
                return;
              }
              const text = line.getTextContent();
              const token = tokens.find(w => text.includes(w));
              const path = useList ? [0, i] : [i];
              const len = line.getTextContentSize();
              const mark = (kind: 'structural' | string) => {
                if (token === undefined) {
                  return;
                }
                if (kind === 'structural') {
                  structural.set(token, (structural.get(token) ?? 0) + 1);
                }
              };
              if (r < 0.2 && count > 1 && token !== undefined) {
                removed.add(token);
                mark('structural');
                line.remove();
              } else if (r < 0.45 && len > 0) {
                $selectIn(path, Math.floor(rnd() * (len + 1))).insertText('xy');
              } else if (r < 0.6 && len > 0) {
                mark('structural');
                $selectIn(
                  path,
                  Math.floor(rnd() * (len + 1)),
                ).insertParagraph();
              } else if (r < 0.7 && i > 0 && !useList) {
                mark('structural');
                const prev = container.getChildAtIndex(i - 1);
                const prevText = prev ? prev.getTextContent() : '';
                const prevToken = tokens.find(w => prevText.includes(w));
                if (prevToken !== undefined) {
                  structural.set(
                    prevToken,
                    (structural.get(prevToken) ?? 0) + 1,
                  );
                }
                line.selectStart().deleteCharacter(true);
              } else if (r < 0.85 && !useList && token !== undefined) {
                const type = rnd() < 0.5 ? 'heading' : 'quote';
                $setBlocksType($selectIn(path, 0), () =>
                  type === 'heading'
                    ? $createHeadingNode('h2')
                    : $createQuoteNode(),
                );
                if (typed.has(token)) {
                  mark('structural');
                }
                typed.set(token, {peer: peer.doc.clientID, type});
              } else if (len > 0) {
                $selectIn(path, 0, Math.min(2, len)).formatText('bold');
              }
            });
          }
        }
        await t.sync();
        await expectConverged(t.peers);
        for (const peer of t.peers) {
          const all = peer.read(() => $getRoot().getTextContent());
          expect(all).not.toContain(MARKER_CHAR);
          for (const token of removed) {
            expect(all).not.toContain(token);
          }
        }
        for (const [token, {type}] of typed) {
          if ((structural.get(token) ?? 0) > 0 || removed.has(token)) {
            continue;
          }
          const lineType = t.a.read(() => {
            const line = $getRoot()
              .getChildren()
              .find(c => c.getTextContent().includes(token));
            return line === undefined ? null : line.getType();
          });
          if (lineType !== null) {
            expect(lineType).toBe(type);
          }
        }
      }
    },
  );
});

describe('block-marker layout, declarations', () => {
  test('a subclass that declares slots is stored as a node, and A is unaffected', async () => {
    class SlotParagraph extends ParagraphNode {
      $config() {
        return this.config('test_slot_paragraph', {
          extends: ParagraphNode,
          slots: ['note'],
        });
      }
    }
    for (const option of ['inlineFormats', 'blockMarkers'] as const) {
      const doc = new Y.Doc();
      const editor = createEditor({
        namespace: 'test',
        nodes: [SlotParagraph],
        onError: e => {
          throw e;
        },
      });
      const binding = createBindingV2__EXPERIMENTAL(
        editor,
        'main',
        doc,
        new Map([['main', doc]]),
        {[option]: true},
      );
      initializeInlineFormatLayout__EXPERIMENTAL(binding);
      const provider = createProvider();
      editor.registerUpdateListener(
        ({
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        }) =>
          syncLexicalUpdateToYjsV2__EXPERIMENTAL(
            binding,
            provider,
            prevEditorState,
            editorState,
            dirtyElements,
            dirtyLeaves,
            normalizedNodes,
            tags,
          ),
      );
      expect(() =>
        editor.update(
          () => {
            $getRoot()
              .clear()
              .append($create(SlotParagraph).append($createTextNode('x')));
          },
          {discrete: true},
        ),
      ).not.toThrow();
      const fresh = createEditor({
        namespace: 'test',
        nodes: [SlotParagraph],
        onError: e => {
          throw e;
        },
      });
      const freshDoc = new Y.Doc();
      Y.applyUpdate(freshDoc, Y.encodeStateAsUpdate(doc));
      const freshBinding = createBindingV2__EXPERIMENTAL(
        fresh,
        'main',
        freshDoc,
        new Map([['main', freshDoc]]),
      );
      syncYjsStateToLexicalV2__EXPERIMENTAL(freshBinding, provider);
      expect(fresh.read(() => $getRoot().getFirstChild()!.getType())).toBe(
        'test_slot_paragraph',
      );
    }
  });

  test('a legacy subclass with a property outside its schema is stored as a node', async () => {
    class LegacyParagraph extends ParagraphNode {
      __foo: string = '';
      static getType(): string {
        return 'test_legacy_paragraph';
      }
      static clone(node: LegacyParagraph): LegacyParagraph {
        const clone = new LegacyParagraph(node.__key);
        clone.__foo = node.__foo;
        return clone;
      }
      static importJSON(
        json: SerializedParagraphNode & {foo?: string},
      ): LegacyParagraph {
        return new LegacyParagraph().setFoo(json.foo ?? '');
      }
      exportJSON(): SerializedParagraphNode {
        return {
          ...super.exportJSON(),
          foo: this.getLatest().__foo,
        } as SerializedParagraphNode;
      }
      setFoo(foo: string): this {
        const self = this.getWritable();
        self.__foo = foo;
        return self;
      }
      getFoo(): string {
        return this.getLatest().__foo;
      }
    }
    const make = (id: number) => {
      const doc = new Y.Doc();
      doc.clientID = id;
      const editor = createEditor({
        namespace: 'test',
        nodes: [LegacyParagraph],
        onError: e => {
          throw e;
        },
      });
      const binding = createBindingV2__EXPERIMENTAL(
        editor,
        'main',
        doc,
        new Map([['main', doc]]),
        {blockMarkers: true},
      );
      return {binding, doc, editor};
    };
    const a = make(1);
    initializeInlineFormatLayout__EXPERIMENTAL(a.binding);
    const provider = createProvider();
    a.editor.registerUpdateListener(
      ({
        prevEditorState,
        editorState,
        dirtyElements,
        dirtyLeaves,
        normalizedNodes,
        tags,
      }) =>
        syncLexicalUpdateToYjsV2__EXPERIMENTAL(
          a.binding,
          provider,
          prevEditorState,
          editorState,
          dirtyElements,
          dirtyLeaves,
          normalizedNodes,
          tags,
        ),
    );
    a.editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            new LegacyParagraph().setFoo('bar').append($createTextNode('x')),
          );
      },
      {discrete: true},
    );
    const b = make(2);
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    syncYjsStateToLexicalV2__EXPERIMENTAL(b.binding, provider);
    expect(
      b.editor.read(() =>
        ($getRoot().getFirstChild() as LegacyParagraph).getFoo(),
      ),
    ).toBe('bar');
  });
});

describe('block-marker layout', () => {
  test('stores a container as one flow of lines and markers', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $p('one'),
        $createHeadingNode('h2').append($createTextNode('two')),
      ),
    );
    const flow = t.a.binding.root.get(0) as Y.XmlText;
    expect(flow).toBeInstanceOf(Y.XmlText);
    const delta = flow.toDelta() as {
      insert: string;
      attributes?: Record<string, unknown>;
    }[];
    expect(delta.map(d => d.insert).join('')).toBe(
      `one${MARKER_CHAR}two${MARKER_CHAR}`,
    );
    expect(delta[1].attributes).toEqual({bt: 'paragraph'});
    expect(delta[3].attributes).toEqual({bt: 'heading', 'b|tag': 'h2'});
    expect(t.a.doc.getMap(LAYOUT_MAP_NAME).get('root:root-v2')).toBe(2);
    await expectConverged(t.peers);
  });

  test('round-trips a document with every kind of node', async () => {
    const t = await setup(() => {
      const aligned = $p('aligned').setFormat('center').setIndent(2);
      $setState(aligned, blockState, 'kept');
      $getRoot().append(
        aligned,
        $createHeadingNode('h3').append(
          $createTextNode('bold').toggleFormat('bold'),
          $createTextNode(' head'),
        ),
        $createQuoteNode().append(
          $createTextNode('quoted'),
          $createLineBreakNode(),
          $createTextNode('second line'),
        ),
        $createListNode('bullet').append(
          $li('b1'),
          $createListItemNode().append(
            $createListNode('bullet').append($li('b1.1'), $li('b1.2')),
          ),
          $li('b2'),
        ),
        $createListNode('number', 3).append($li('n3'), $li('n4')),
        $createListNode('check').append(
          $createListItemNode(true).append($createTextNode('done')),
          $createListItemNode(false).append($createTextNode('todo')),
        ),
        $createParagraphNode().append(
          $createTextNode('see '),
          new LinkNode('https://lexical.dev').append($createTextNode('docs')),
          $createTextNode(' and '),
          $createTestInlineElementNode().append($createTextNode('inline')),
          $createTestDecoratorNode(),
        ),
        $createTableNode().append(
          $createTableRowNode().append(
            $createTableCellNode().append($p('c1')),
            $createTableCellNode().append($p('c2'), $p('c2b')),
          ),
        ),
        $createCalloutNode('tip').append(
          $createHeadingNode('h4').append($createTextNode('in callout')),
          $p('body'),
        ),
        $createCodeNode('js').append(
          $createTextNode('const x = 1;'),
          $createLineBreakNode(),
          $createTextNode('x++;'),
        ),
        $createTestDecoratorNode(),
        $createParagraphNode(),
        $p('last'),
      );
    });
    await expectConverged(t.peers);
    expect(t.b.describe()).toBe(t.a.describe());
    expect(t.b.describe()).toContain(
      'list[bullet](listitem("b1") listitem(list[bullet](listitem("b1.1") listitem("b1.2"))) listitem("b2"))',
    );
    expect(t.b.describe()).toContain(
      'list[number,3](listitem("n3") listitem("n4"))',
    );
    expect(t.b.describe()).toContain(
      'list[check](listitem[x]("done") listitem[ ]("todo"))',
    );
    // Everything the schema says about each node survives.
    expect(t.b.json()).toEqual(t.a.json());
  });

  test('a keystroke rewrites only its line', async () => {
    const t = await setup(() => {
      for (let i = 0; i < 50; i++) {
        $getRoot().append($p(`paragraph ${i}`));
      }
    });
    const before = Y.encodeStateVector(t.a.doc);
    t.a.update(() => $selectIn([25], 3).insertText('x'));
    const update = Y.encodeStateAsUpdate(t.a.doc, before);
    // One character with its attributes, not a rewrite of the document.
    expect(update.length).toBeLessThan(120);
    await t.sync();
    await expectConverged(t.peers);
  });

  test('Enter is a marker insert and Backspace a marker delete', async () => {
    const t = await setup(() => $getRoot().append($p(P)));
    const flow = t.a.binding.root.get(0) as Y.XmlText;
    const text = () =>
      (flow.toDelta() as {insert: string}[]).map(d => d.insert).join('');
    t.a.update(() => $selectIn([0], 8).insertParagraph());
    expect(text()).toBe(`Revenue ${MARKER_CHAR}grew 4% in Q3.${MARKER_CHAR}`);
    t.a.update(() => $selectIn([1], 0).deleteCharacter(true));
    expect(text()).toBe(`${P}${MARKER_CHAR}`);
    await t.sync();
    await expectConverged(t.peers, `paragraph("${P}")`);
  });

  test('retyping, re-indenting and changing a list type only format markers', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $p(P),
        $createListNode('bullet').append($li('one'), $li('two')),
      ),
    );
    const flow = t.a.binding.root.get(0) as Y.XmlText;
    const text = () =>
      (flow.toDelta() as {insert: string}[]).map(d => d.insert).join('');
    const before = text();
    for (const op of [
      () => $setBlocksType($selectIn([0], 3), () => $createHeadingNode('h3')),
      () => ($block([1, 1]) as ListItemNode).setIndent(1),
      () => ($block([1]) as ListNode).setListType('check'),
    ]) {
      const sv = Y.encodeStateVector(t.a.doc);
      t.a.update(op);
      const {structs} = Y.decodeUpdate(Y.encodeStateAsUpdate(t.a.doc, sv));
      // No character was inserted: only formatting items.
      expect(
        structs.some(
          s => s instanceof Y.Item && s.content instanceof Y.ContentString,
        ),
      ).toBe(false);
      expect(text()).toBe(before);
    }
    await t.sync();
    await expectConverged(
      t.peers,
      // setListType changes the outer list only, as without collaboration.
      'heading[h3]("Revenue grew 4% in Q3.") / list[check](listitem[ ]("one") listitem[ ](list[bullet](listitem("two"))))',
    );
  });

  test('undo of a split and of a type change', async () => {
    const t = await setup(() => $getRoot().append($p(P)));
    t.a.update(() => $selectIn([0], 8).insertParagraph());
    t.a.update(() =>
      $setBlocksType($selectIn([1], 0), () => $createHeadingNode('h1')),
    );
    await t.sync();
    t.a.undoManager.undo();
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("Revenue ") / paragraph("grew 4% in Q3.")',
    );
    t.a.undoManager.undo();
    await t.sync();
    await expectConverged(t.peers, `paragraph("${P}")`);
  });

  test('outdent and list item checked state merge with typing', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $createListNode('check').append(
          $createListItemNode(false).append($createTextNode('a')),
          $createListItemNode().append(
            $createListNode('check').append(
              $createListItemNode(false).append($createTextNode('b')),
            ),
          ),
        ),
      ),
    );
    t.offline();
    t.a.update(() => ($block([0, 1, 0, 0]) as ListItemNode).setIndent(0));
    t.b.update(() => {
      ($block([0, 1, 0, 0]) as ListItemNode).setChecked(true);
      $selectIn([0, 1, 0, 0], 1).insertText('!');
    });
    await t.sync();
    await expectConverged(
      t.peers,
      'list[check](listitem[ ]("a") listitem[x]("b!"))',
    );
  });

  test('a line that breaks its declaration is stored as an embedded node', async () => {
    const t = await setup(() =>
      $getRoot().append(
        $p('before'),
        // A block child: this paragraph cannot be a line.
        $createParagraphNode().append($create(WidgetNode)),
        $p('after'),
      ),
    );
    const delta = (t.a.binding.root.get(0) as Y.XmlText).toDelta() as {
      insert: unknown;
    }[];
    expect(delta.some(d => d.insert instanceof Y.XmlElement)).toBe(true);
    await expectConverged(
      t.peers,
      'paragraph("before") / paragraph(test_widget) / paragraph("after")',
    );
    t.offline();
    t.a.update(() => $selectIn([2], 5).insertParagraph());
    t.b.update(() => $selectIn([0], 6).insertText('!'));
    await t.sync();
    await expectConverged(
      t.peers,
      'paragraph("before!") / paragraph(test_widget) / paragraph("after") / paragraph()',
    );
  });

  test('typing into a line a peer deleted keeps the text in a paragraph', async () => {
    const t = await setup(() => $getRoot().append($p('keep'), $p('gone')));
    t.offline();
    t.a.update(() => $block([1]).remove());
    t.b.update(() => $selectIn([1], 4).insertText('!'));
    await t.sync();
    await expectConverged(t.peers, 'paragraph("keep") / paragraph("!")');
  });

  test('a document marked with a newer layout version is read-only', async () => {
    const t = await setup(() => $getRoot().append($p(P)));
    t.a.doc.getMap(LAYOUT_MAP_NAME).set('root:root-v2', 3);
    await t.sync();
    expect(getInlineFormatLayoutState__EXPERIMENTAL(t.b.binding)).toBe(
      'unsupported',
    );
    const before = Y.encodeStateVector(t.b.doc);
    t.b.update(() => $selectIn([0], 0).insertText('ignored'));
    expect(Y.encodeStateVector(t.b.doc)).toEqual(before);
    await flush();
    expect(t.b.warnings.map(e => e.message)).toEqual([
      expect.stringContaining('layout version 3'),
    ]);
    expect(t.b.editor.isEditable()).toBe(false);
  });

  describe('cursors', () => {
    function roundTrip(peer: Peer, select: () => void, reader: Peer = peer) {
      let expected: {key: string; offset: number; text: string} | null = null;
      peer.update(() => {
        select();
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          throw new Error('expected a range selection');
        }
        syncLexicalSelectionToYjs(peer.binding, peer.provider, null, selection);
        const node = selection.anchor.getNode();
        expected = {
          key: selection.anchor.key,
          offset: selection.anchor.offset,
          text: node.getTextContent(),
        };
      });
      const state = peer.provider.awareness.getLocalState()!;
      const result = reader.read(() => {
        const r = $getAnchorAndFocusForUserState(reader.binding, state);
        const node = r.anchorKey === null ? null : $getNodeByKey(r.anchorKey);
        return {
          key: r.anchorKey,
          offset: r.anchorOffset,
          text: node === null ? null : node.getTextContent(),
        };
      });
      return {expected: expected!, result};
    }

    test('text points in lines, list items and table cells round trip', async () => {
      const t = await setup(() =>
        $getRoot().append(
          $p('first line'),
          $createListNode('bullet').append($li('one'), $li('two')),
          $createTableNode().append(
            $createTableRowNode().append(
              $createTableCellNode().append($p('cell text')),
            ),
          ),
        ),
      );
      for (const [path, offset] of [
        [[0], 0],
        [[0], 5],
        [[0], 10],
        [[1, 1], 2],
        [[2, 0, 0, 0], 4],
      ] as [number[], number][]) {
        const {expected, result} = roundTrip(t.a, () =>
          $selectIn(path, offset),
        );
        expect(result).toEqual(expected);
        // A peer resolves it to the same characters.
        const remote = roundTrip(t.a, () => $selectIn(path, offset), t.b);
        expect(remote.result.text).toBe(expected.text);
        expect(remote.result.offset).toBe(expected.offset);
      }
    });

    test('a remote cursor follows its characters across a concurrent split', async () => {
      const t = await setup(() => $getRoot().append($p(P)));
      t.b.update(() => $selectIn([0], 15));
      const {expected} = roundTrip(t.b, () => $selectIn([0], 15));
      expect(expected.offset).toBe(15);
      const state = t.b.provider.awareness.getLocalState()!;
      t.a.update(() => $selectIn([0], 8).insertParagraph());
      await t.sync();
      const result = t.a.read(() => {
        const r = $getAnchorAndFocusForUserState(t.a.binding, state);
        return {
          offset: r.anchorOffset,
          text: $getNodeByKey(r.anchorKey!)!.getTextContent(),
        };
      });
      expect(result).toEqual({offset: 7, text: 'grew 4% in Q3.'});
    });
  });

  test('the default and inline-format layouts are untouched by the option', async () => {
    const t = await setup(() => $getRoot().append($p(P)), {
      blockMarkers: false,
    });
    expect(getInlineFormatLayoutState__EXPERIMENTAL(t.a.binding)).toBe(
      'default',
    );
    expect(t.a.binding.root.get(0)).toBeInstanceOf(Y.XmlElement);
  });
});
