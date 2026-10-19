/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {$isLinkNode, $toggleLink, AutoLinkNode, LinkNode} from '@lexical/link';
import {
  $getAnchorAndFocusForUserState,
  type BindingV2,
  createBindingV2__EXPERIMENTAL,
  createUndoManager,
  disposeBindingV2__EXPERIMENTAL,
  getInlineFormatLayoutState__EXPERIMENTAL,
  initializeInlineFormatLayout__EXPERIMENTAL,
  isInlineFormatLayoutActive__EXPERIMENTAL,
  type Provider,
  type ProviderAwareness,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
  type UserState,
} from '@lexical/yjs';
import {
  $create,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $getState,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  $setCompositionKey,
  $setSelection,
  $setState,
  createEditor,
  createState,
  ElementNode,
  getDeclaredCollabConfig,
  type LexicalEditor,
  type LexicalNode,
  nodeSchema,
  stringValue,
  type TextNode,
  withField,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';
import * as Y from 'yjs';

import {syncLexicalSelectionToYjs} from '../../SyncCursors';
import {LAYOUT_MAP_NAME} from '../../SyncV2';

// A test-only format wrapper with one schema field.
const highlightSchema = nodeSchema<HighlightNode>()({
  color: withField(stringValue(), {field: '__color'}),
});
class HighlightNode extends ElementNode {
  __color: string = '';
  $config() {
    return this.config('test_highlight', {
      collab: {inline: 'format'},
      extends: ElementNode,
      json: highlightSchema,
    });
  }
  getColor(): string {
    return this.getLatest().__color;
  }
  setColor(color: string): this {
    const self = this.getWritable();
    self.__color = color;
    return self;
  }
  isInline(): true {
    return true;
  }
  canBeEmpty(): false {
    return false;
  }
  createDOM(): HTMLElement {
    throw new Error('headless');
  }
  updateDOM(): boolean {
    return false;
  }
}
// The same node type as a later version would declare it, with a new field.
const highlightV2Schema = nodeSchema<HighlightNodeV2>()({
  note: withField(stringValue(), {field: '__note'}),
});
class HighlightNodeV2 extends HighlightNode {
  __note: string = '';
  $config() {
    return this.config('test_highlight', {
      extends: HighlightNode,
      json: highlightV2Schema,
    });
  }
  getNote(): string {
    return this.getLatest().__note;
  }
  setNote(note: string): this {
    const self = this.getWritable();
    self.__note = note;
    return self;
  }
}
const $createHighlightNode = (color: string) =>
  $create(HighlightNode).setColor(color);
const $isHighlightNode = (
  node: LexicalNode | null | undefined,
): node is HighlightNode => node instanceof HighlightNode;

// A class with no collab declaration, for getDeclaredCollabConfig.
class PlainElementNode extends ElementNode {
  $config() {
    return this.config('test_plain_element', {extends: ElementNode});
  }
}

const linkState = createState('linkState', {
  parse: v => (typeof v === 'string' ? v : ''),
});

const P = 'Revenue grew 4% in Q3.';
// "grew 4%" is [8, 15).

function createAwareness(): ProviderAwareness & {state: UserState | null} {
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
  return awareness;
}

// A relay: every update goes through one FIFO queue, so each peer receives
// updates in causal order (a reaction never arrives before what it reacts to).
type Network = {
  peers: Peer[];
  queue: [Peer, Uint8Array][];
  pumping: boolean;
};

function createNetwork(): Network {
  return {peers: [], pumping: false, queue: []};
}

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

class Peer {
  readonly doc: Y.Doc;
  readonly editor: LexicalEditor;
  readonly binding: BindingV2;
  readonly provider: Provider;
  readonly undoManager: Y.UndoManager;
  online = true;
  pending: Uint8Array[] = [];
  warnings: Error[] = [];

  constructor(
    clientID: number,
    readonly net: Network,
    inlineFormats: boolean,
    highlight: typeof HighlightNode = HighlightNode,
  ) {
    this.doc = new Y.Doc({gc: false});
    this.doc.clientID = clientID;
    this.editor = createEditor({
      namespace: 'test',
      nodes: [LinkNode, AutoLinkNode, highlight, TestDecoratorNode],
      onError: e => {
        throw e;
      },
      onWarn: e => {
        this.warnings.push(e);
      },
    });
    this.provider = {
      awareness: createAwareness(),
      connect: () => {},
      disconnect: () => {},
      off: () => {},
      on: () => {},
    } as unknown as Provider;
    this.binding = createBindingV2__EXPERIMENTAL(
      this.editor,
      'main',
      this.doc,
      new Map([['main', this.doc]]),
      {inlineFormats},
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
        if (peer !== this) {
          if (this.online && peer.online) {
            this.net.queue.push([peer, update]);
          } else {
            peer.pending.push(update);
          }
        }
      }
      pump(this.net);
    });
    net.peers.push(this);
  }

  update(fn: () => void) {
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
  if ($isLinkNode(node)) {
    const url = node.getURL();
    return `${node.getType()}<${url}>(${node
      .getChildren()
      .map(describeNode)
      .join(' ')})`;
  }
  if ($isHighlightNode(node)) {
    return `hl<${node.getColor()}>(${node
      .getChildren()
      .map(describeNode)
      .join(' ')})`;
  }
  if ($isElementNode(node)) {
    return `${node.getType()}(${node.getChildren().map(describeNode).join(' ')})`;
  }
  return node.getType();
}

async function flush() {
  await new Promise(resolve => setTimeout(resolve, 0));
}

function exchangeState(a: Peer, b: Peer) {
  for (const [from, to] of [
    [a, b],
    [b, a],
  ]) {
    to.pending = [];
    Y.applyUpdate(
      to.doc,
      Y.encodeStateAsUpdate(from.doc, Y.encodeStateVector(to.doc)),
      to.net,
    );
  }
}

const layoutVersion = (peer: Peer) =>
  peer.doc.getMap(LAYOUT_MAP_NAME).get('root:root-v2');

function $highlight(start: number, end: number, color: string) {
  const nodes = $select(start, end).extract().filter($isTextNode);
  const wrapper = $createHighlightNode(color);
  nodes[0].insertBefore(wrapper);
  wrapper.append(...nodes);
}

const $firstLink = () =>
  $para()
    .getAllTextNodes()
    .map(t => t.getParent())
    .find($isLinkNode) as LinkNode;

function setup(
  options: {
    a?: boolean;
    b?: boolean;
    init?: () => void;
    /** Client ids of the peers, in order; defaults to two peers [1, 2]. */
    ids?: number[];
  } = {},
): {
  a: Peer;
  b: Peer;
  peers: Peer[];
  offline: () => void;
  sync: () => Promise<void>;
} {
  const net = createNetwork();
  const ids = options.ids ?? [1, 2];
  const peers = ids.map(
    (id, i) =>
      new Peer(id, net, i === 0 ? (options.a ?? true) : (options.b ?? true)),
  );
  const [a, b] = peers;
  // A new document: the first client puts it in the layout (if it was asked
  // to), as the collaboration plugin does after the provider's first sync.
  initializeInlineFormatLayout__EXPERIMENTAL(a.binding);
  a.update(() => {
    $getRoot()
      .clear()
      .append($createParagraphNode().append($createTextNode(P)));
    if (options.init) {
      options.init();
    }
  });
  a.undoManager.clear();
  return {
    a,
    b,
    offline() {
      for (const peer of peers) {
        peer.online = false;
      }
    },
    peers,
    async sync() {
      for (const peer of peers) {
        peer.online = true;
      }
      for (const peer of peers) {
        if (peer.pending.length > 0) {
          net.queue.push([peer, Y.mergeUpdates(peer.pending)]);
          peer.pending = [];
        }
      }
      pump(net);
      await flush();
    },
  };
}

function $para(index = 0): ElementNode {
  return $getRoot().getChildAtIndex(index) as ElementNode;
}

function $locate(offset: number): [TextNode, number] {
  const texts = $para().getAllTextNodes();
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

function $select(start: number, end: number = start) {
  const [startNode, startOffset] = $locate(start);
  const [endNode, endOffset] = $locate(end);
  const selection = $createRangeSelection();
  selection.anchor.set(startNode.getKey(), startOffset, 'text');
  selection.focus.set(endNode.getKey(), endOffset, 'text');
  $setSelection(selection);
  return selection;
}

function $link(start: number, end: number, url = 'https://x') {
  $select(start, end);
  $toggleLink(url);
}

function $typeAt(offset: number, text: string) {
  $select(offset).insertText(text);
}

function expectConverged(a: Peer, b: Peer, expected: string) {
  expect(a.describe()).toBe(expected);
  expect(b.describe()).toBe(expected);
}

/** Characters deleted by an update (the delete set's total length). */
function deletedLength(update: Uint8Array): number {
  const decoded = Y.decodeUpdate(update);
  let length = 0;
  decoded.ds.clients.forEach(items => {
    for (const item of items) {
      length += item.len;
    }
  });
  return length;
}

describe('collab-v2 inline-format layout', () => {
  test('LinkNode is declared a format wrapper and AutoLinkNode inherits it', () => {
    expect(getDeclaredCollabConfig(LinkNode)).toEqual({inline: 'format'});
    expect(getDeclaredCollabConfig(AutoLinkNode)).toEqual({inline: 'format'});
    expect(getDeclaredCollabConfig(PlainElementNode)).toEqual({});
  });

  test('default layout is unchanged: links are XmlElements, formats live in p', () => {
    const {a, b} = setup({a: false, b: false});
    a.update(() => {
      $link(8, 15);
      $select(0, 7).formatText('bold');
    });
    const paragraph = a.binding.root.get(0) as Y.XmlElement;
    expect(layoutVersion(a)).toBe(undefined);
    expect(paragraph.toArray().map(child => child.constructor.name)).toEqual([
      'YXmlText',
      'YXmlElement',
      'YXmlText',
    ]);
    expect((paragraph.get(1) as Y.XmlElement).nodeName).toBe('link');
    const delta = (paragraph.get(0) as Y.XmlText).toDelta();
    expect(delta[0].attributes).toEqual({p: {__format: 1}});
    expect(
      delta.some((d: {attributes?: object}) =>
        Object.keys(d.attributes || {}).some(
          k => k.startsWith('w_') || k.startsWith('f_'),
        ),
      ),
    ).toBe(false);
    expect(b.describe()).toBe(
      'paragraph("Revenue"{1} " " link<https://x>("grew 4%") " in Q3.")',
    );
  });

  test('wrapping text in a link is a pure format change', () => {
    const {a, b} = setup();
    const updates: Uint8Array[] = [];
    a.doc.on('update', (update: Uint8Array) => updates.push(update));
    a.update(() => $link(8, 15));
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.map(deletedLength)).toEqual(updates.map(() => 0));
    const paragraph = a.binding.root.get(0) as Y.XmlElement;
    expect(paragraph.length).toBe(1);
    expect((paragraph.get(0) as Y.XmlText).toDelta()).toEqual([
      {insert: 'Revenue '},
      {
        attributes: {
          i: 1,
          w_link: true,
          'w_link|rel': 'noreferrer',
          'w_link|url': 'https://x',
        },
        insert: 'grew 4%',
      },
      {attributes: {i: 2}, insert: ' in Q3.'},
    ]);
    expect(layoutVersion(a)).toBe(1);
    expectConverged(
      a,
      b,
      'paragraph("Revenue " link<https://x>("grew 4%") " in Q3.")',
    );
  });

  test('W1: typing inside a range while a peer links it stays inside the link', async () => {
    const ctx = setup();
    ctx.offline();
    ctx.a.update(() => $typeAt(13, 'by '));
    ctx.b.update(() => $link(8, 15));
    await ctx.sync();
    expectConverged(
      ctx.a,
      ctx.b,
      'paragraph("Revenue " link<https://x>("grew by 4%") " in Q3.")',
    );
  });

  test('W4: undoing your own link keeps the text a peer typed inside it', async () => {
    const ctx = setup();
    ctx.a.update(() => $link(8, 15));
    ctx.a.undoManager.stopCapturing();
    ctx.b.update(() => $typeAt(13, 'by '));
    ctx.a.undoManager.undo();
    await ctx.sync();
    expectConverged(ctx.a, ctx.b, 'paragraph("Revenue grew by 4% in Q3.")');
  });

  test('W5: typing at the end of a link while a peer replaces its text keeps both', async () => {
    const ctx = setup({init: () => $link(8, 15)});
    ctx.offline();
    ctx.a.update(() => $typeAt(15, '!'));
    ctx.b.update(() => $select(8, 15).insertText('D124'));
    await ctx.sync();
    // Both edits survive and the text is not duplicated. Where "!" lands
    // relative to D124 follows Yjs's insertion ordering.
    expect(ctx.a.describe()).toBe(ctx.b.describe());
    const text = ctx.a.read(() => $para().getTextContent());
    expect(text).toContain('!');
    expect(text).toContain('D124');
    expect(text.replace('!', '').replace('D124', '')).toBe('Revenue  in Q3.');
  });

  test('R2: unlinking while a peer types inside keeps the typed text', async () => {
    const ctx = setup({init: () => $link(8, 15)});
    ctx.offline();
    ctx.a.update(() => $typeAt(13, 'by '));
    ctx.b.update(() => {
      $select(8, 15);
      $toggleLink(null);
    });
    await ctx.sync();
    expectConverged(ctx.a, ctx.b, 'paragraph("Revenue grew by 4% in Q3.")');
  });

  test('link ‖ link on the same range: one copy, one link', async () => {
    const ctx = setup();
    ctx.offline();
    ctx.a.update(() => $link(8, 15, 'https://a'));
    ctx.b.update(() => $link(8, 15, 'https://b'));
    await ctx.sync();
    // Last writer wins on the attribute value (client 2 here).
    expectConverged(
      ctx.a,
      ctx.b,
      'paragraph("Revenue " link<https://b>("grew 4%") " in Q3.")',
    );
  });

  describe('three peers: link wrap ‖ unlink ‖ unrelated edit', () => {
    for (const ids of [
      [1, 2, 3],
      [1, 3, 2],
      [2, 1, 3],
      [2, 3, 1],
      [3, 1, 2],
      [3, 2, 1],
    ]) {
      test(`client ids ${ids.join(',')}`, async () => {
        const ctx = setup({ids, init: () => $link(8, 15)});
        const [a, b, c] = ctx.peers;
        ctx.offline();
        a.update(() => $link(16, 21, 'https://a'));
        b.update(() => {
          $select(8, 15);
          $toggleLink(null);
        });
        c.update(() => $typeAt(0, 'Z'));
        await ctx.sync();
        const expected =
          'paragraph("ZRevenue grew 4% " link<https://a>("in Q3") ".")';
        for (const peer of ctx.peers) {
          expect(peer.describe()).toBe(expected);
        }
      });
    }
  });

  describe('POS: typing while a peer links "grew 4%"', () => {
    for (const [label, offset, expected] of [
      [
        'before',
        3,
        'paragraph("RevZZenue " link<https://x>("grew 4%") " in Q3.")',
      ],
      [
        'at start',
        8,
        'paragraph("Revenue ZZ" link<https://x>("grew 4%") " in Q3.")',
      ],
      [
        'inside',
        11,
        'paragraph("Revenue " link<https://x>("greZZw 4%") " in Q3.")',
      ],
      [
        'after',
        19,
        'paragraph("Revenue " link<https://x>("grew 4%") " in ZZQ3.")',
      ],
      [
        'at end of paragraph',
        22,
        'paragraph("Revenue " link<https://x>("grew 4%") " in Q3.ZZ")',
      ],
    ] as const) {
      test(label, async () => {
        const ctx = setup();
        ctx.offline();
        ctx.a.update(() => $typeAt(offset, 'ZZ'));
        ctx.b.update(() => $link(8, 15));
        await ctx.sync();
        expectConverged(ctx.a, ctx.b, expected);
      });
    }
  });

  test('concurrent bold and italic on overlapping text both apply', async () => {
    const ctx = setup();
    ctx.offline();
    ctx.a.update(() => $select(8, 15).formatText('bold'));
    ctx.b.update(() => $select(12, 19).formatText('italic'));
    await ctx.sync();
    expectConverged(
      ctx.a,
      ctx.b,
      'paragraph("Revenue " "grew"{1} " 4%"{3} " in "{2} "Q3.")',
    );
    const delta = (
      (ctx.a.binding.root.get(0) as Y.XmlElement).get(0) as Y.XmlText
    ).toDelta();
    expect(delta[2].attributes).toMatchObject({f_bold: true, f_italic: true});
    expect(delta[2].attributes.p).toBe(undefined);
  });

  test('concurrent bold and italic on the same text both apply', async () => {
    const ctx = setup();
    ctx.offline();
    ctx.a.update(() => $select(8, 15).formatText('bold'));
    ctx.b.update(() => $select(8, 15).formatText('italic'));
    await ctx.sync();
    expectConverged(
      ctx.a,
      ctx.b,
      'paragraph("Revenue " "grew 4%"{3} " in Q3.")',
    );
  });

  test('adjacent links with equal attributes merge, overlapping wrappers nest longest outermost', async () => {
    const {a, b} = setup();
    a.update(() => {
      $link(0, 7);
      $link(8, 15);
    });
    a.update(() => {
      // Link the space between them with the same URL: one link remains.
      $link(7, 8);
    });
    await flush();
    expectConverged(
      a,
      b,
      'paragraph(link<https://x>("Revenue grew 4%") " in Q3.")',
    );
  });

  test('a link and a highlight over the same span nest by type', () => {
    const {a, b} = setup();
    a.update(() => {
      $link(8, 15);
      const link = $para().getChildAtIndex(1) as LinkNode;
      const highlight = $createHighlightNode('red');
      link.insertBefore(highlight);
      highlight.append(link);
    });
    // Equal spans nest by type name: "link" < "test_highlight". The writer is
    // converged on that shape in the same update, by a node transform.
    expectConverged(
      a,
      b,
      'paragraph("Revenue " link<https://x>(hl<red>("grew 4%")) " in Q3.")',
    );
  });

  test('a wrapper nested in one of the same type converges in the same update', () => {
    const {a, b} = setup({init: () => $highlight(8, 15, 'red')});
    const updates: Uint8Array[] = [];
    a.doc.on('update', (update: Uint8Array) => updates.push(update));
    let shapeSeenByListeners = '';
    const remove = a.editor.registerUpdateListener(() => {
      shapeSeenByListeners = a.describe();
    });
    a.update(() => {
      const outer = $para().getChildAtIndex(1) as HighlightNode;
      const inner = $createHighlightNode('blue');
      inner.append(...outer.getChildren());
      outer.append(inner);
    });
    remove();
    // The innermost value of a type wins, as it does on every reader.
    const expected = 'paragraph("Revenue " hl<blue>("grew 4%") " in Q3.")';
    expect(shapeSeenByListeners).toBe(expected);
    expectConverged(a, b, expected);
    expect(updates.length).toBe(1);
  });

  test('a wrapper changed while composing is canonicalized when the composition ends', async () => {
    const {a, b} = setup({init: () => $highlight(8, 15, 'red')});
    a.update(() => {
      const outer = $para().getChildAtIndex(1) as HighlightNode;
      $setCompositionKey(outer.getFirstChildOrThrow().getKey());
      const inner = $createHighlightNode('blue');
      inner.append(...outer.getChildren());
      outer.append(inner);
    });
    // Left alone while composing...
    expect(a.describe()).toBe(
      'paragraph("Revenue " hl<red>(hl<blue>("grew 4%")) " in Q3.")',
    );
    a.update(() => $setCompositionKey(null));
    await flush();
    // ...and rebuilt right after it ends.
    expectConverged(
      a,
      b,
      'paragraph("Revenue " hl<blue>("grew 4%") " in Q3.")',
    );
  });

  test('an application transform that reshapes wrappers wins locally', () => {
    const {a, b} = setup();
    // Splits every highlight after its first character: the opposite of the
    // canonical shape, which merges adjacent equal highlights.
    a.editor.registerNodeTransform(HighlightNode, node => {
      const text = node.getFirstChild();
      if (
        node.getChildrenSize() === 1 &&
        $isTextNode(text) &&
        text.getTextContentSize() > 1
      ) {
        const [, rest] = text.splitText(1);
        const next = $createHighlightNode(node.getColor());
        node.insertAfter(next);
        next.append(rest);
      }
    });
    a.update(() => $highlight(8, 15, 'red'));
    // No endless transform loop: the local shape is the application's, the
    // stored content is the same, and peers read the canonical shape.
    expect(a.read(() => $para().getTextContent())).toBe(P);
    expect(a.describe()).not.toBe(b.describe());
    expect(b.describe()).toBe(
      'paragraph("Revenue " hl<red>("grew 4%") " in Q3.")',
    );
  });

  test('concurrent highlights with different values on overlapping text', async () => {
    const ctx = setup();
    ctx.offline();
    ctx.a.update(() => $highlight(8, 15, 'red'));
    ctx.b.update(() => $highlight(12, 19, 'blue'));
    await ctx.sync();
    // No text is lost or duplicated. This is the documented limit of Yjs
    // formatting with one key over overlapping ranges: the overlap gets one
    // value (here the later client's), and the range past the first range's
    // end loses its value.
    expect(ctx.a.read(() => $para().getTextContent())).toBe(P);
    expectConverged(
      ctx.a,
      ctx.b,
      'paragraph("Revenue " hl<red>("grew") hl<blue>(" 4%") " in Q3.")',
    );
  });

  test('a newer peer’s wrapper fields are kept by an older peer', () => {
    const net = createNetwork();
    const newer = new Peer(1, net, true, HighlightNodeV2);
    const older = new Peer(2, net, true, HighlightNode);
    initializeInlineFormatLayout__EXPERIMENTAL(newer.binding);
    newer.update(() => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(P)));
      $highlight(8, 15, 'red');
      ($para().getChildAtIndex(1) as HighlightNodeV2).setNote('kept');
    });
    // The older peer edits inside the highlight and changes its color.
    older.update(() => $typeAt(11, 'xx'));
    older.update(() =>
      ($para().getChildAtIndex(1) as HighlightNode).setColor('blue'),
    );
    newer.read(() => {
      const highlight = $para().getChildAtIndex(1);
      assert(highlight instanceof HighlightNodeV2);
      expect(highlight.getColor()).toBe('blue');
      expect(highlight.getNote()).toBe('kept');
      expect(highlight.getTextContent()).toBe('grexxw 4%');
    });
    const delta = (
      (older.binding.root.get(0) as Y.XmlElement).get(0) as Y.XmlText
    ).toDelta();
    expect(delta[1].attributes).toMatchObject({
      'w_test_highlight|color': 'blue',
      'w_test_highlight|note': 'kept',
    });
  });

  describe('concurrent property change and removal', () => {
    for (const ids of [
      [1, 2],
      [2, 1],
    ]) {
      test(`R1: URL change ‖ typing right after the link (${ids})`, async () => {
        const ctx = setup({ids, init: () => $link(8, 15)});
        ctx.offline();
        ctx.a.update(() => $firstLink().setURL('https://u'));
        ctx.b.update(() => $typeAt(15, '>'));
        await ctx.sync();
        expectConverged(
          ctx.a,
          ctx.b,
          'paragraph("Revenue " link<https://u>("grew 4%") "> in Q3.")',
        );
      });

      test(`R3: deleting the link text ‖ URL change (${ids})`, async () => {
        const ctx = setup({ids, init: () => $link(8, 15)});
        ctx.offline();
        ctx.a.update(() => $select(8, 15).removeText());
        ctx.b.update(() => $firstLink().setURL('https://u'));
        await ctx.sync();
        expectConverged(ctx.a, ctx.b, 'paragraph("Revenue  in Q3.")');
      });

      test(`R15: undoing your link ‖ a peer changes its URL (${ids})`, async () => {
        const ctx = setup({ids});
        ctx.a.undoManager.stopCapturing();
        ctx.a.update(() => $link(8, 15));
        ctx.a.undoManager.stopCapturing();
        await ctx.sync();
        ctx.offline();
        ctx.a.undoManager.undo();
        ctx.b.update(() => $firstLink().setURL('https://u'));
        await ctx.sync();
        // The peer's URL change keeps the link on its own range; nothing
        // spreads over the rest of the paragraph.
        expect(ctx.a.describe()).toBe(ctx.b.describe());
        expect(ctx.a.describe()).not.toContain('" in Q3.")');
        expect([
          'paragraph("Revenue grew 4% in Q3.")',
          'paragraph("Revenue " link<https://u>("grew 4%") " in Q3.")',
        ]).toContain(ctx.a.describe());
      });
    }
  });

  test('NodeState on a wrapper is preserved', () => {
    const {a, b} = setup();
    a.update(() => {
      $link(8, 15);
      const link = $para().getChildAtIndex(1) as LinkNode;
      $setState(link, linkState, 'hello');
      link.setTitle('t');
    });
    b.read(() => {
      const link = $para().getChildAtIndex(1);
      assert($isLinkNode(link));
      expect($getState(link, linkState)).toBe('hello');
      expect(link.getTitle()).toBe('t');
    });
  });

  test('remote edits keep the receiving peer’s wrapper keys', () => {
    const {a, b} = setup({init: () => $link(8, 15)});
    const key = b.read(() => $para().getChildAtIndex(1)!.getKey());
    a.update(() => $typeAt(11, 'xx'));
    a.update(() => $select(9, 11).formatText('bold'));
    a.update(() =>
      ($para().getChildAtIndex(1) as LinkNode).setURL('https://y'),
    );
    expect(b.describe()).toBe(
      'paragraph("Revenue " link<https://y>("g" "re"{1} "xxw 4%") " in Q3.")',
    );
    expect(b.read(() => $para().getChildAtIndex(1)!.getKey())).toBe(key);
  });

  describe('line breaks', () => {
    test('a line break inside a link stays in the run', () => {
      const {a, b} = setup({init: () => $link(8, 15)});
      a.update(() => {
        const link = $para().getChildAtIndex(1) as LinkNode;
        const text = link.getFirstChild() as TextNode;
        const [, tail] = text.splitText(4);
        tail.insertBefore($createLineBreakNode());
      });
      const paragraph = a.binding.root.get(0) as Y.XmlElement;
      expect(paragraph.length).toBe(1);
      expect(b.describe()).toBe(
        'paragraph("Revenue " link<https://x>("grew" br " 4%") " in Q3.")',
      );
    });

    test('a line break that lost its type attribute is still read as one', () => {
      const {a, b} = setup();
      a.update(() => $select(4).insertLineBreak());
      const text = (a.binding.root.get(0) as Y.XmlElement).get(0) as Y.XmlText;
      // Strip the type the way a partial undo or a concurrent rewrite can.
      a.doc.transact(() => text.format(4, 1, {t: null}));
      expect(text.toDelta()[1]).toEqual({attributes: {i: 1}, insert: '\n'});
      expect(b.describe()).toBe('paragraph("Reve" br "nue grew 4% in Q3.")');
    });

    test('link ‖ line break inside the range', async () => {
      const ctx = setup();
      ctx.offline();
      ctx.a.update(() => $select(12).insertLineBreak());
      ctx.b.update(() => $link(8, 15));
      await ctx.sync();
      expectConverged(
        ctx.a,
        ctx.b,
        'paragraph("Revenue " link<https://x>("grew" br " 4%") " in Q3.")',
      );
    });

    test('link ‖ earlier line break keeps the link', async () => {
      const ctx = setup();
      ctx.offline();
      ctx.a.update(() => $select(4).insertLineBreak());
      ctx.b.update(() => $link(16, 21));
      await ctx.sync();
      expectConverged(
        ctx.a,
        ctx.b,
        'paragraph("Reve" br "nue grew 4% " link<https://x>("in Q3") ".")',
      );
    });
  });

  test('an inline decorator inside a link is split out and reassembles', () => {
    const {a, b} = setup({init: () => $link(8, 15)});
    a.update(() => {
      const link = $para().getChildAtIndex(1) as LinkNode;
      const text = link.getFirstChild() as TextNode;
      const [, tail] = text.splitText(4);
      tail.insertBefore($createTestDecoratorNode());
    });
    const paragraph = a.binding.root.get(0) as Y.XmlElement;
    expect(paragraph.length).toBe(3);
    expect(
      (paragraph.get(1) as Y.XmlElement).getAttribute('__wrappers'),
    ).toEqual({
      w_link: true,
      'w_link|rel': 'noreferrer',
      'w_link|url': 'https://x',
    });
    expect(b.describe()).toBe(
      'paragraph("Revenue " link<https://x>("grew" test_decorator " 4%") " in Q3.")',
    );
  });

  describe('adoption and compatibility', () => {
    test('initializing an empty document marks it', () => {
      const {a, b} = setup({b: false});
      expect(layoutVersion(a)).toBe(1);
      expect(isInlineFormatLayoutActive__EXPERIMENTAL(a.binding)).toBe(true);
      // A binding without the option follows the mark.
      expect(isInlineFormatLayoutActive__EXPERIMENTAL(b.binding)).toBe(true);
      // The mark lives outside the root, so writes to the root never drop it.
      expect(a.binding.root.getAttributes()).toEqual({});
    });

    test('a marked document is written in the layout even with the option off', async () => {
      const ctx = setup({a: true, b: false});
      ctx.offline();
      ctx.a.update(() => $typeAt(13, 'by '));
      ctx.b.update(() => $link(8, 15));
      await ctx.sync();
      expectConverged(
        ctx.a,
        ctx.b,
        'paragraph("Revenue " link<https://x>("grew by 4%") " in Q3.")',
      );
      expect((ctx.b.binding.root.get(0) as Y.XmlElement).length).toBe(1);
    });

    test('an existing document is never converted', () => {
      const net = createNetwork();
      const old = new Peer(1, net, false);
      old.update(() => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode(P)));
        $link(8, 15);
        $select(0, 7).formatText('bold');
        const link = $para().getChildAtIndex(2) as LinkNode;
        (link.getFirstChild() as TextNode).insertAfter($createLineBreakNode());
      });
      const expected =
        'paragraph("Revenue"{1} " " link<https://x>("grew 4%" br) " in Q3.")';
      const next = new Peer(2, net, true);
      Y.applyUpdate(next.doc, Y.encodeStateAsUpdate(old.doc), net);
      // The opted-in client reads the default layout...
      expect(next.describe()).toBe(expected);
      expect(isInlineFormatLayoutActive__EXPERIMENTAL(next.binding)).toBe(
        false,
      );
      // ...and keeps writing it: the link stays an XmlElement and nothing is
      // marked.
      next.update(() => $typeAt(13, 'by '));
      const expectedAfter =
        'paragraph("Revenue"{1} " " link<https://x>("grew by 4%" br) " in Q3.")';
      expect(next.describe()).toBe(expectedAfter);
      expect(old.describe()).toBe(expectedAfter);
      expect(layoutVersion(next)).toBe(undefined);
      const paragraph = next.binding.root.get(0) as Y.XmlElement;
      expect(
        paragraph
          .toArray()
          .filter(child => child instanceof Y.XmlElement)
          .map(child => (child as Y.XmlElement).nodeName),
      ).toEqual(['link']);
    });

    test('content written before the first sync does not mark an existing document', async () => {
      for (const ids of [
        [1, 2],
        [2, 1],
      ]) {
        const net = createNetwork();
        const server = new Peer(ids[0], net, false);
        server.update(() => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode(P)));
          $link(8, 15);
        });
        const client = new Peer(ids[1], net, true);
        server.online = false;
        client.online = false;
        // The opted-in client types before its provider synced.
        client.update(() => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode('draft')));
        });
        // The provider's first sync: exchange full states.
        server.online = true;
        client.online = true;
        exchangeState(server, client);
        // After the sync the document is not empty: it stays in the default
        // layout.
        expect(initializeInlineFormatLayout__EXPERIMENTAL(client.binding)).toBe(
          'default',
        );
        expect(layoutVersion(client)).toBe(undefined);
        const index = client.read(() =>
          $getRoot()
            .getChildren()
            .findIndex(c => c.getTextContent().includes('Revenue')),
        );
        const $typeIn = (offset: number, text: string) => {
          const paragraph = $getRoot().getChildAtIndex(index) as ElementNode;
          const [node, at] = (() => {
            let acc = 0;
            for (const t of paragraph.getAllTextNodes()) {
              if (offset <= acc + t.getTextContentSize()) {
                return [t, offset - acc] as const;
              }
              acc += t.getTextContentSize();
            }
            throw new Error('offset out of range');
          })();
          const selection = $createRangeSelection();
          selection.anchor.set(node.getKey(), at, 'text');
          selection.focus.set(node.getKey(), at, 'text');
          $setSelection(selection);
          selection.insertText(text);
        };
        server.online = false;
        client.online = false;
        client.update(() => $typeIn(0, 'A'));
        server.update(() => $typeIn(10, 'W'));
        server.update(() => $typeIn(23, 'B'));
        server.online = true;
        client.online = true;
        exchangeState(server, client);
        await flush();
        expect(client.describe()).toBe(server.describe());
        expect(
          client.read(() =>
            $getRoot().getChildAtIndex(index)!.getTextContent(),
          ),
        ).toBe('ARevenue grWew 4% in Q3.B');
      }
    });

    test('a default binding does not write an editor’s existing content', async () => {
      const editor = createEditor({
        namespace: 'test',
        nodes: [LinkNode, AutoLinkNode, HighlightNode],
        onError: e => {
          throw e;
        },
      });
      editor.update(
        () => {
          $getRoot()
            .clear()
            .append($createParagraphNode().append($createTextNode(P)));
          $link(8, 15);
        },
        {discrete: true},
      );
      const provider = {
        awareness: createAwareness(),
        connect: () => {},
        disconnect: () => {},
        off: () => {},
        on: () => {},
      } as unknown as Provider;
      for (const inlineFormats of [false, true]) {
        const doc = new Y.Doc();
        const binding = createBindingV2__EXPERIMENTAL(
          editor,
          'main',
          doc,
          new Map([['main', doc]]),
          {inlineFormats},
        );
        const remove = editor.registerUpdateListener(
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
        await flush();
        remove();
        expect(binding.root.length).toBe(0);
        expect(Y.encodeStateVector(doc)).toEqual(
          Y.encodeStateVector(new Y.Doc()),
        );
      }
    });

    test('disposing a binding unregisters its transforms', () => {
      const {a, b} = setup({init: () => $highlight(8, 15, 'red')});
      disposeBindingV2__EXPERIMENTAL(a.binding);
      a.update(() => {
        const outer = $para().getChildAtIndex(1) as HighlightNode;
        const inner = $createHighlightNode('blue');
        inner.append(...outer.getChildren());
        outer.append(inner);
      });
      // Not canonicalized locally any more (the next sync registers them
      // again); the peer reads the canonical shape.
      expect(a.describe()).toBe(
        'paragraph("Revenue " hl<red>(hl<blue>("grew 4%")) " in Q3.")',
      );
      expect(b.describe()).toBe(
        'paragraph("Revenue " hl<blue>("grew 4%") " in Q3.")',
      );
    });

    test('a document marked with a newer layout version is not written', async () => {
      const net = createNetwork();
      const writer = new Peer(1, net, true);
      initializeInlineFormatLayout__EXPERIMENTAL(writer.binding);
      writer.update(() => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode(P)));
      });
      writer.doc.getMap(LAYOUT_MAP_NAME).set('root:root-v2', 2);
      const reader = new Peer(2, net, true);
      Y.applyUpdate(reader.doc, Y.encodeStateAsUpdate(writer.doc), net);
      expect(reader.describe()).toBe(`paragraph(${JSON.stringify(P)})`);
      expect(getInlineFormatLayoutState__EXPERIMENTAL(reader.binding)).toBe(
        'unsupported',
      );
      expect(isInlineFormatLayoutActive__EXPERIMENTAL(reader.binding)).toBe(
        false,
      );
      await flush();
      // Reported through onWarn, and the editor is made read-only.
      expect(reader.warnings.length).toBe(1);
      expect(reader.editor.isEditable()).toBe(false);
      const before = Y.encodeStateVector(reader.doc);
      reader.update(() => $typeAt(0, 'Z'));
      expect(Y.encodeStateVector(reader.doc)).toEqual(before);
      expect(writer.describe()).toBe(`paragraph(${JSON.stringify(P)})`);
    });

    test('keys of unknown wrapper types and formats are preserved on write', () => {
      const {a, b} = setup();
      const text = (a.binding.root.get(0) as Y.XmlElement).get(0) as Y.XmlText;
      a.doc.transact(() => {
        text.format(0, 7, {f_future: true, w_future: true, x_future: 1});
      });
      a.update(() => $typeAt(22, '!'));
      b.update(() => $typeAt(3, 'Z'));
      const delta = (
        (b.binding.root.get(0) as Y.XmlElement).get(0) as Y.XmlText
      ).toDelta();
      // B typed inside the formatted range, so its "Z" carries them too, as
      // Yjs would have given it.
      expect(delta[0]).toEqual({
        attributes: {f_future: true, w_future: true, x_future: 1},
        insert: 'RevZenue',
      });
      expect(a.read(() => $para().getTextContent())).toBe(
        'RevZenue grew 4% in Q3.!',
      );
    });
  });

  describe('cursor positions', () => {
    function roundTrip(peer: Peer, $setup: () => void) {
      let expected: unknown;
      peer.update(() => {
        $setup();
        const selection = $getSelection();
        assert(selection !== null);
        syncLexicalSelectionToYjs(peer.binding, peer.provider, null, selection);
        const point = (selection as ReturnType<typeof $createRangeSelection>)
          .anchor;
        expected = {key: point.key, offset: point.offset};
      });
      const state = peer.provider.awareness.getLocalState()!;
      const result = peer.read(() =>
        $getAnchorAndFocusForUserState(peer.binding, state),
      );
      return {
        expected,
        result: {key: result.anchorKey, offset: result.anchorOffset},
      };
    }

    test('text points inside and after a link round trip', () => {
      const {a} = setup({init: () => $link(8, 15)});
      for (const offset of [10, 15, 18]) {
        const {expected, result} = roundTrip(a, () => $select(offset));
        if (offset === 15) {
          // The end of the link and the start of the next text are one caret
          // position; it decodes to the end of the preceding text node.
          expect(result.offset).toBe(7);
        } else {
          expect(result).toEqual(expected);
        }
      }
    });

    test('an element point on a link maps to the text inside it', () => {
      const {a} = setup({init: () => $link(8, 15)});
      let textKey = '';
      const {result} = roundTrip(a, () => {
        const link = $para().getChildAtIndex(1) as LinkNode;
        textKey = link.getFirstChildOrThrow().getKey();
        const selection = $createRangeSelection();
        selection.anchor.set(link.getKey(), 1, 'element');
        selection.focus.set(link.getKey(), 1, 'element');
        $setSelection(selection);
      });
      expect(result).toEqual({key: textKey, offset: 7});
    });
  });
});
