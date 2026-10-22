/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  type Binding,
  type BindingV2,
  createBinding,
  createBindingV2__EXPERIMENTAL,
  type Provider,
  syncLexicalUpdateToYjs,
  syncLexicalUpdateToYjsV2__EXPERIMENTAL,
  syncYjsChangesToLexical,
  syncYjsChangesToLexicalV2__EXPERIMENTAL,
} from '@lexical/yjs';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSlot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  $setSlot,
  defineExtension,
  ElementNode,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  TextNode,
} from 'lexical';
import {
  afterEach,
  assert,
  describe,
  expect,
  onTestFinished,
  test,
  vi,
} from 'vitest';
import {
  AbstractType,
  applyUpdate,
  Doc,
  encodeStateAsUpdate,
  Map as YMap,
  UndoManager,
  XmlElement,
  XmlText,
} from 'yjs';

// A block element that only the newer client registers.
class CalloutNode extends ElementNode {
  $config() {
    return this.config('test-callout', {extends: ElementNode});
  }
}

function $createCalloutNode(): CalloutNode {
  return $create(CalloutNode);
}

// A custom TextNode type that only the newer client registers.
class MentionNode extends TextNode {
  $config() {
    return this.config('test-mention', {extends: TextNode});
  }
}

function $createMentionNode(text: string): MentionNode {
  return $create(MentionNode).setTextContent(text);
}

// An inline element that only the newer client registers.
class InlineTagNode extends ElementNode {
  $config() {
    return this.config('test-inline-tag', {extends: ElementNode});
  }
  isInline(): boolean {
    return true;
  }
}

// A host both clients register, with a named slot.
class HostNode extends ElementNode {
  $config() {
    return this.config('test-host', {extends: ElementNode, slots: ['caption']});
  }
}

const noop = () => {};
const provider = {
  awareness: {
    getLocalState: () => null,
    getStates: () => new Map(),
    off: noop,
    on: noop,
    setLocalState: noop,
    setLocalStateField: noop,
  },
  connect: noop,
  disconnect: noop,
  off: noop,
  on: noop,
} as unknown as Provider;

type Peer = {
  binding: Binding | BindingV2;
  doc: Doc;
  editor: LexicalEditor;
  name: string;
};

const RELAY = {relay: true};

const errors: Error[] = [];

// Two or more clients, wired like useYjsCollaboration(V2), each with its own
// node registry and `unregisteredNodeTypes: 'keep'`. Updates are relayed
// synchronously while connected. (The default, `'throw'`, is covered by
// CollabUnregisteredNodeTypesDefault.test.ts.)
function createNetwork(useCollabV2: boolean) {
  const peers: Peer[] = [];

  function createPeer(
    name: string,
    clientID: number,
    nodes: Klass<LexicalNode>[],
    onWarn?: (error: Error) => void,
  ): Peer {
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: `[collab-unknown-node-types-${name}]`,
        nodes: () => nodes,
        // Report and carry on, like an application would, so a test can show
        // what an error leaves behind; afterEach fails on any error.
        onError: (error: Error) => {
          errors.push(error);
        },
        ...(onWarn !== undefined && {onWarn}),
      }),
    );
    onTestFinished(() => editor.dispose());
    const doc = new Doc({gc: false});
    doc.clientID = clientID;
    onTestFinished(() => doc.destroy());
    const docMap = new Map([['main', doc]]);
    let binding: Binding | BindingV2;
    if (useCollabV2) {
      const bindingV2 = createBindingV2__EXPERIMENTAL(
        editor,
        'main',
        doc,
        docMap,
        {unregisteredNodeTypes: 'keep'},
      );
      bindingV2.root.observeDeep((events, transaction) => {
        if (transaction.origin !== bindingV2) {
          syncYjsChangesToLexicalV2__EXPERIMENTAL(
            bindingV2,
            provider,
            events as Parameters<
              typeof syncYjsChangesToLexicalV2__EXPERIMENTAL
            >[2],
            transaction,
            transaction.origin instanceof UndoManager,
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
            bindingV2,
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
      binding = bindingV2;
    } else {
      const bindingV1 = createBinding(
        editor,
        provider,
        'main',
        doc,
        docMap,
        undefined,
        {unregisteredNodeTypes: 'keep'},
      );
      bindingV1.root.getSharedType().observeDeep((events, transaction) => {
        if (transaction.origin !== bindingV1) {
          syncYjsChangesToLexical(
            bindingV1,
            provider,
            events as Parameters<typeof syncYjsChangesToLexical>[2],
            transaction.origin instanceof UndoManager,
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
          syncLexicalUpdateToYjs(
            bindingV1,
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
      binding = bindingV1;
    }
    const peer = {binding, doc, editor, name};
    doc.on('update', (yUpdate: Uint8Array, origin: unknown) => {
      if (origin === RELAY || !peers.includes(peer)) {
        return;
      }
      for (const other of peers) {
        if (other !== peer) {
          applyUpdate(other.doc, yUpdate, RELAY);
        }
      }
    });
    return peer;
  }

  // Joining sends each side the other's full state, like a provider sync.
  function connect(peer: Peer) {
    for (const other of peers) {
      applyUpdate(peer.doc, encodeStateAsUpdate(other.doc), RELAY);
      applyUpdate(other.doc, encodeStateAsUpdate(peer.doc), RELAY);
    }
    peers.push(peer);
  }

  function disconnect(peer: Peer) {
    peers.splice(peers.indexOf(peer), 1);
  }

  return {connect, createPeer, disconnect};
}

function update(peer: Peer, fn: () => void) {
  // Commit remote changes first (v1 applies them in a deferred update), so
  // that the local edit is not merged into an update tagged as remote.
  peer.editor.read(noop);
  peer.editor.update(fn, {discrete: true});
}

// One line per root child: `type:text`, with element children in brackets.
function describeNode(node: LexicalNode): string {
  if ($isElementNode(node)) {
    return `${node.getType()}[${node
      .getChildren()
      .map(describeNode)
      .join(',')}]`;
  }
  return `${node.getType()}:${node.getTextContent()}`;
}

function lexicalTree(peer: Peer): string[] {
  return peer.editor.read(() => $getRoot().getChildren().map(describeNode));
}

// The peer's Yjs document flattened in document order: `<type>` for each node
// stored as a shared type or a typed text range, and the text itself.
function yjsContent(peer: Peer): string[] {
  const out: string[] = [];
  const visit = (type: unknown) => {
    if (type instanceof XmlElement) {
      const v1Type = type.getAttribute('__type');
      out.push(`<${typeof v1Type === 'string' ? v1Type : type.nodeName}>`);
      type.toArray().forEach(visit);
    } else if (type instanceof XmlText) {
      const v1Type = type.getAttribute('__type');
      if (typeof v1Type === 'string') {
        out.push(`<${v1Type}>`);
      }
      for (const op of type.toDelta() as {
        insert: unknown;
        attributes?: {t?: string};
      }[]) {
        if (op.insert instanceof AbstractType) {
          visit(op.insert);
        } else {
          if (op.attributes && op.attributes.t) {
            out.push(`<${op.attributes.t}>`);
          }
          out.push(String(op.insert));
        }
      }
    } else if (type instanceof YMap) {
      const v1Type = type.get('__type');
      if (typeof v1Type === 'string') {
        out.push(`<${v1Type}>`);
      }
    }
  };
  if ('mapping' in peer.binding) {
    peer.binding.root.toArray().forEach(visit);
  } else {
    visit(peer.binding.root.getSharedType());
  }
  return out;
}

function expectConverged(a: Peer, b: Peer) {
  expect(yjsContent(a)).toEqual(yjsContent(b));
}

function $appendParagraph(text: string) {
  const paragraph = $createParagraphNode().append($createTextNode(text));
  $getRoot().append(paragraph);
  return paragraph;
}

function $paragraphWithText(text: string) {
  const paragraph = $getRoot()
    .getChildren()
    .find(
      node => $isParagraphNode(node) && node.getTextContent().startsWith(text),
    );
  assert($isParagraphNode(paragraph), `no paragraph starting with ${text}`);
  return paragraph;
}

function $appendToParagraph(text: string, suffix: string) {
  const textNode = $paragraphWithText(text).getLastChild();
  assert($isTextNode(textNode));
  textNode.setTextContent(textNode.getTextContent() + suffix);
}

function $callout(): CalloutNode {
  const callout = $getRoot()
    .getChildren()
    .find(node => node instanceof CalloutNode);
  assert(callout instanceof CalloutNode);
  return callout;
}

describe.each([
  ['v1', false],
  ['v2', true],
])('collab %s: node types one client does not register', (_, useCollabV2) => {
  afterEach(() => {
    vi.restoreAllMocks();
    const reported = errors.splice(0);
    expect(reported.map(error => error.message)).toEqual([]);
  });

  // `newer` registers CalloutNode and MentionNode, `older` does not. Both
  // start from the same two paragraphs.
  function setup() {
    vi.spyOn(console, 'warn').mockImplementation(noop);
    const network = createNetwork(useCollabV2);
    const newer = network.createPeer('newer', 1, [
      CalloutNode,
      MentionNode,
      InlineTagNode,
      HostNode,
    ]);
    const older = network.createPeer('older', 2, [HostNode]);
    network.connect(newer);
    update(newer, () => {
      $getRoot().clear();
      $appendParagraph('alpha');
      $appendParagraph('omega');
    });
    network.connect(older);
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha]',
      'paragraph[text:omega]',
    ]);
    return {network, newer, older};
  }

  function $insertCalloutAfterAlpha() {
    $paragraphWithText('alpha').insertAfter(
      $createCalloutNode().append(
        $createParagraphNode().append($createTextNode('inside')),
      ),
    );
  }

  test('an unknown block survives an edit elsewhere by the older client', () => {
    const {newer, older} = setup();
    update(newer, $insertCalloutAfterAlpha);

    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha]',
      'paragraph[text:omega]',
    ]);

    update(older, () => $appendToParagraph('omega', '!'));

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha]',
      'test-callout[paragraph[text:inside]]',
      'paragraph[text:omega!]',
    ]);
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha]',
      'paragraph[text:omega!]',
    ]);
    expect(yjsContent(older)).toContain('<test-callout>');
    expectConverged(newer, older);
  });

  test('the rest of an update that carries an unknown block is applied', () => {
    const {newer, older} = setup();
    update(newer, () => {
      $insertCalloutAfterAlpha();
      $appendToParagraph('alpha', ' beta');
      $appendParagraph('tail');
    });

    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha beta]',
      'paragraph[text:omega]',
      'paragraph[text:tail]',
    ]);

    // The older client's tree lines up with the document, so removing its
    // last paragraph removes `tail`, not a neighbour.
    update(older, () => {
      $getRoot().getLastChildOrThrow().remove();
    });

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha beta]',
      'test-callout[paragraph[text:inside]]',
      'paragraph[text:omega]',
    ]);
    expectConverged(newer, older);
  });

  test('edits inside the unknown block keep syncing between newer clients', () => {
    const {newer, older} = setup();
    update(newer, $insertCalloutAfterAlpha);
    update(older, () => $appendToParagraph('alpha', '1'));
    update(newer, () => {
      const inner = $callout().getFirstChildOrThrow<ElementNode>();
      inner.append($createTextNode(' more'));
    });
    update(older, () => $appendToParagraph('omega', '2'));
    update(newer, () => {
      $callout().append(
        $createParagraphNode().append($createTextNode('second')),
      );
    });
    update(older, () => $appendToParagraph('alpha', '3'));

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha13]',
      'test-callout[paragraph[text:inside more],paragraph[text:second]]',
      'paragraph[text:omega2]',
    ]);
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha13]',
      'paragraph[text:omega2]',
    ]);
    expectConverged(newer, older);
  });

  test('a second newer client that joins later sees the unknown block and the older edits', () => {
    const {network, newer, older} = setup();
    update(newer, $insertCalloutAfterAlpha);
    update(older, () => $appendToParagraph('omega', '!'));
    const late = network.createPeer('late', 3, [
      CalloutNode,
      MentionNode,
      InlineTagNode,
      HostNode,
    ]);
    network.connect(late);

    expect(lexicalTree(late)).toEqual([
      'paragraph[text:alpha]',
      'test-callout[paragraph[text:inside]]',
      'paragraph[text:omega!]',
    ]);
    update(late, () => {
      const inner = $callout().getFirstChildOrThrow<ElementNode>();
      inner.append($createTextNode('!'));
    });
    expect(lexicalTree(newer)).toEqual(lexicalTree(late));
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha]',
      'paragraph[text:omega!]',
    ]);
    expectConverged(newer, older);
    expectConverged(newer, late);
  });

  test('structural edits next to the unknown block do not move or delete it', () => {
    const {newer, older} = setup();
    update(newer, $insertCalloutAfterAlpha);

    // Split `alpha` (right before the block): the new paragraph stays before
    // the block. Then remove `omega` (right after it).
    update(older, () => {
      const alpha = $paragraphWithText('alpha');
      alpha.insertAfter($createParagraphNode().append($createTextNode('a2')));
    });
    update(older, () => {
      $paragraphWithText('omega').remove();
    });

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha]',
      'paragraph[text:a2]',
      'test-callout[paragraph[text:inside]]',
    ]);
    expectConverged(newer, older);

    // Replace all of the older client's visible content.
    update(older, () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode('fresh')));
    });

    expect(lexicalTree(older)).toEqual(['paragraph[text:fresh]']);
    expect(lexicalTree(newer)).toContain(
      'test-callout[paragraph[text:inside]]',
    );
    expect(yjsContent(newer)).toContain('<test-callout>');
    expectConverged(newer, older);
  });

  test('content added after a block that follows an unknown block stays in place', () => {
    const {newer, older} = setup();
    update(newer, () => {
      $getRoot()
        .getFirstChildOrThrow()
        .insertBefore(
          $createCalloutNode().append(
            $createParagraphNode().append($createTextNode('top')),
          ),
        );
    });
    update(older, () => {
      $paragraphWithText('alpha').insertAfter(
        $createParagraphNode().append($createTextNode('a2')),
      );
    });
    update(older, () => {
      $getRoot()
        .getFirstChildOrThrow()
        .insertBefore($createParagraphNode().append($createTextNode('first')));
    });

    expect(lexicalTree(newer)).toEqual([
      'test-callout[paragraph[text:top]]',
      'paragraph[text:first]',
      'paragraph[text:alpha]',
      'paragraph[text:a2]',
      'paragraph[text:omega]',
    ]);
    expectConverged(newer, older);
  });

  test('concurrent edits next to an unknown block merge without losing it', () => {
    const {network, newer, older} = setup();
    network.disconnect(older);
    update(newer, $insertCalloutAfterAlpha);
    update(older, () => {
      $appendToParagraph('alpha', ' beta');
      $paragraphWithText('alpha').insertAfter(
        $createParagraphNode().append($createTextNode('a2')),
      );
      $paragraphWithText('omega').remove();
    });
    network.connect(older);
    update(older, () => $appendToParagraph('a2', '!'));

    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha beta]',
      'paragraph[text:a2!]',
    ]);
    expect(lexicalTree(newer)).toContain(
      'test-callout[paragraph[text:inside]]',
    );
    expect(
      lexicalTree(newer).filter(
        line => line !== 'test-callout[paragraph[text:inside]]',
      ),
    ).toEqual(['paragraph[text:alpha beta]', 'paragraph[text:a2!]']);
    expectConverged(newer, older);
  });

  test('nested unknown blocks are kept', () => {
    const {newer, older} = setup();
    update(newer, () => {
      $getRoot().append(
        $createCalloutNode().append(
          $createParagraphNode().append($createTextNode('outer')),
          $createCalloutNode().append(
            $createParagraphNode().append($createTextNode('nested')),
          ),
        ),
      );
    });
    update(older, () => $appendToParagraph('alpha', '!'));
    update(newer, () => {
      const outer = $getRoot().getLastChildOrThrow<ElementNode>();
      const nested = outer.getLastChildOrThrow<ElementNode>();
      nested.getFirstChildOrThrow<ElementNode>().append($createTextNode('+'));
    });
    update(older, () => $appendToParagraph('omega', '!'));

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega!]',
      'test-callout[paragraph[text:outer],test-callout[paragraph[text:nested+]]]',
    ]);
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega!]',
    ]);
    expectConverged(newer, older);
  });

  test('a paragraph holding an unknown TextNode type is hidden whole and kept', () => {
    const {newer, older} = setup();
    update(newer, () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('hi '),
          $createMentionNode('@bob'),
          $createTextNode(' there'),
        ),
      );
    });
    update(older, () => $appendToParagraph('alpha', '!'));
    update(newer, () => $appendToParagraph('omega', '?'));

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega?]',
      'paragraph[text:hi ,test-mention:@bob,text: there]',
    ]);
    // Showing the paragraph without the mention would join its text around
    // the gap, so the paragraph is hidden instead.
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega?]',
    ]);
    expect(yjsContent(older)).toContain('<test-mention>');
    expectConverged(newer, older);
  });

  test('a paragraph is hidden while it holds unknown inline content and shown again after', () => {
    const {newer, older} = setup();
    update(newer, () => {
      const text = $paragraphWithText('alpha').getFirstChildOrThrow<TextNode>();
      const [, right] = text.splitText(2);
      right.insertBefore($createMentionNode('@bob'));
    });
    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:al,test-mention:@bob,text:pha]',
      'paragraph[text:omega]',
    ]);
    expect(lexicalTree(older)).toEqual(['paragraph[text:omega]']);

    update(older, () => $appendToParagraph('omega', '!'));
    update(newer, () => {
      const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
      paragraph.getLastChildOrThrow<TextNode>().setTextContent('pha+');
    });
    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:al,test-mention:@bob,text:pha+]',
      'paragraph[text:omega!]',
    ]);
    expectConverged(newer, older);

    // Once the mention is gone the older client shows the paragraph again,
    // with the edits made while it was hidden, and can edit it.
    update(newer, () => {
      const paragraph = $getRoot().getFirstChildOrThrow<ElementNode>();
      paragraph.getChildren()[1].remove();
    });
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha+]',
      'paragraph[text:omega!]',
    ]);
    update(older, () => $appendToParagraph('alpha', '?'));
    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha+?]',
      'paragraph[text:omega!]',
    ]);
    expectConverged(newer, older);
  });

  test('a paragraph holding an unknown inline element is hidden whole and kept', () => {
    const {newer, older} = setup();
    update(newer, () => {
      $getRoot().append(
        $createParagraphNode().append(
          $createTextNode('see '),
          $create(InlineTagNode).append($createTextNode('tag')),
          $createTextNode(' here'),
        ),
      );
    });
    update(older, () => $appendToParagraph('omega', '!'));
    update(newer, () => {
      const tag = $getRoot()
        .getLastChildOrThrow<ElementNode>()
        .getChildren()[1] as InlineTagNode;
      tag.append($createTextNode('+'));
    });
    update(older, () => $appendToParagraph('alpha', '!'));

    expect(lexicalTree(newer)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega!]',
      'paragraph[text:see ,test-inline-tag[text:tag+],text: here]',
    ]);
    expect(lexicalTree(older)).toEqual([
      'paragraph[text:alpha!]',
      'paragraph[text:omega!]',
    ]);
    expectConverged(newer, older);
  });

  test('an unknown slot value survives host edits by the older client', () => {
    const {newer, older} = setup();
    update(newer, () => {
      const host = $create(HostNode).append(
        $createParagraphNode().append($createTextNode('body')),
      );
      $setSlot(
        host,
        'caption',
        $createParagraphNode().append($createTextNode('known caption')),
      );
      $getRoot().append(host);
    });
    expect(lexicalTree(older)).toContain('test-host[paragraph[text:body]]');

    // Replace the caption with a node type the older client cannot show.
    update(newer, () => {
      const host = $getRoot().getLastChildOrThrow<HostNode>();
      $setSlot(
        host,
        'caption',
        $createCalloutNode().append(
          $createParagraphNode().append($createTextNode('cap')),
        ),
      );
    });
    update(older, () => {
      const host = $getRoot().getLastChildOrThrow<ElementNode>();
      host
        .getFirstChildOrThrow<ElementNode>()
        .append($createTextNode(' edited'));
    });

    newer.editor.read(() => {
      const host = $getRoot().getLastChildOrThrow<ElementNode>();
      expect(host.getFirstChildOrThrow().getTextContent()).toBe('body edited');
      const caption = $getSlot(host, 'caption');
      assert(caption instanceof CalloutNode);
      expect(caption.getTextContent()).toBe('cap');
    });
    older.editor.read(() => {
      expect($getSlot($getRoot().getLastChildOrThrow(), 'caption')).toBe(null);
    });
    expectConverged(newer, older);
  });

  test('reports each unregistered type once through onWarn', () => {
    vi.spyOn(console, 'warn').mockImplementation(noop);
    const warnings: string[] = [];
    const network = createNetwork(useCollabV2);
    const newer = network.createPeer('newer', 1, [CalloutNode, MentionNode]);
    const older = network.createPeer('older', 2, [], error => {
      warnings.push(error.message);
    });
    network.connect(newer);
    network.connect(older);
    update(newer, () => {
      $getRoot()
        .clear()
        .append(
          $createParagraphNode().append($createTextNode('a')),
          $createCalloutNode().append($createParagraphNode()),
          $createParagraphNode().append(
            $createTextNode('b '),
            $createMentionNode('@m'),
          ),
        );
    });
    update(older, () => $appendToParagraph('a', '!'));
    update(newer, () => {
      $getRoot().append($createCalloutNode().append($createParagraphNode()));
    });
    update(older, () => $appendToParagraph('a', '?'));

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('"test-callout" is not registered');
    expect(warnings[1]).toContain('"test-mention" is not registered');
    expect(vi.mocked(console.warn)).not.toHaveBeenCalled();
    expect(lexicalTree(newer)[0]).toBe('paragraph[text:a!?]');
  });

  test('warns once per unregistered type with the default onWarn', () => {
    const {newer, older} = setup();
    update(newer, $insertCalloutAfterAlpha);
    update(older, () => $appendToParagraph('omega', '!'));
    update(newer, () => {
      $callout().append($createParagraphNode());
      $getRoot().append($createCalloutNode().append($createParagraphNode()));
    });
    update(older, () => $appendToParagraph('alpha', '!'));

    const warnings = vi
      .mocked(console.warn)
      .mock.calls.filter(args => String(args[0]).includes('"test-callout"'));
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0][0])).toContain('not registered');
  });
});
