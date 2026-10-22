/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @vitest-environment node

/**
 * The default for content of a node type an editor does not register
 * (`unregisteredNodeTypes: 'throw'`, or the option left out) behaves exactly
 * as before the option existed: applying the remote change reports
 * `Node <type> is not registered` to the editor's `onError`, nothing is
 * reported to `onWarn`, and the resulting Lexical trees and Yjs documents are
 * the ones `main` produces. The expected values below were recorded on `main`;
 * this file runs unchanged there.
 */

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

class CalloutNode extends ElementNode {
  $config() {
    return this.config('test-callout', {extends: ElementNode});
  }
}

class MentionNode extends TextNode {
  $config() {
    return this.config('test-mention', {extends: TextNode});
  }
}

class InlineTagNode extends ElementNode {
  $config() {
    return this.config('test-inline-tag', {extends: ElementNode});
  }
  isInline(): boolean {
    return true;
  }
}

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

const RELAY = {relay: true};

type Peer = {
  binding: Binding | BindingV2;
  doc: Doc;
  editor: LexicalEditor;
  errors: string[];
  warnings: string[];
};

function createNetwork(useCollabV2: boolean) {
  const peers: Peer[] = [];

  function createPeer(clientID: number, nodes: Klass<LexicalNode>[]): Peer {
    const errors: string[] = [];
    const warnings: string[] = [];
    const editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: null,
        name: `[collab-unregistered-default-${clientID}]`,
        nodes: () => nodes,
        onError: (error: Error) => {
          errors.push(error.message);
        },
        onWarn: (error: Error) => {
          warnings.push(error.message);
        },
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
      editor.registerUpdateListener(p => {
        syncLexicalUpdateToYjsV2__EXPERIMENTAL(
          bindingV2,
          provider,
          p.prevEditorState,
          p.editorState,
          p.dirtyElements,
          p.dirtyLeaves,
          p.normalizedNodes,
          p.tags,
        );
      });
      binding = bindingV2;
    } else {
      const bindingV1 = createBinding(editor, provider, 'main', doc, docMap);
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
      editor.registerUpdateListener(p => {
        syncLexicalUpdateToYjs(
          bindingV1,
          provider,
          p.prevEditorState,
          p.editorState,
          p.dirtyElements,
          p.dirtyLeaves,
          p.normalizedNodes,
          p.tags,
        );
      });
      binding = bindingV1;
    }
    const peer = {binding, doc, editor, errors, warnings};
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

  function connect(peer: Peer) {
    for (const other of peers) {
      applyUpdate(peer.doc, encodeStateAsUpdate(other.doc), RELAY);
      applyUpdate(other.doc, encodeStateAsUpdate(peer.doc), RELAY);
    }
    peers.push(peer);
  }

  return {connect, createPeer};
}

function update(peer: Peer, fn: () => void) {
  peer.editor.read(noop);
  peer.editor.update(fn, {discrete: true});
}

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
  peer.editor.read(noop);
  return peer.editor.read(() => $getRoot().getChildren().map(describeNode));
}

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

// What the newer client writes next to `alpha`, which the older client cannot
// show.
const SCENARIOS: Record<string, () => void> = {
  'a paragraph holding an unknown TextNode type': () => {
    $paragraphWithText('alpha').insertAfter(
      $createParagraphNode().append(
        $createTextNode('b '),
        $create(MentionNode).setTextContent('@m'),
      ),
    );
  },
  'a paragraph holding an unknown inline element': () => {
    $paragraphWithText('alpha').insertAfter(
      $createParagraphNode().append(
        $createTextNode('c '),
        $create(InlineTagNode).append($createTextNode('tag')),
      ),
    );
  },
  'an unknown block': () => {
    $paragraphWithText('alpha').insertAfter(
      $create(CalloutNode).append(
        $createParagraphNode().append($createTextNode('inside')),
      ),
    );
  },
  'an unknown block and an unrelated edit in one update': () => {
    $appendToParagraph('alpha', ' beta');
    $paragraphWithText('alpha').insertAfter(
      $create(CalloutNode).append($createParagraphNode()),
    );
    $getRoot().append($createParagraphNode().append($createTextNode('tail')));
  },
  'an unknown slot value': () => {
    const host = $create(HostNode).append(
      $createParagraphNode().append($createTextNode('body')),
    );
    $paragraphWithText('alpha').insertAfter(host);
    $setSlot(
      host,
      'caption',
      $create(CalloutNode).append(
        $createParagraphNode().append($createTextNode('cap')),
      ),
    );
  },
};

type Outcome = {
  newer: string[];
  newerYjs: string[];
  older: string[];
  olderErrors: string[];
  olderWarnings: string[];
  olderYjs: string[];
};

function run(useCollabV2: boolean, scenario: () => void): Outcome {
  const network = createNetwork(useCollabV2);
  const newer = network.createPeer(1, [
    CalloutNode,
    MentionNode,
    InlineTagNode,
    HostNode,
  ]);
  const older = network.createPeer(2, [HostNode]);
  network.connect(newer);
  update(newer, () => {
    $getRoot()
      .clear()
      .append(
        $createParagraphNode().append($createTextNode('alpha')),
        $createParagraphNode().append($createTextNode('omega')),
      );
  });
  network.connect(older);
  update(newer, scenario);
  update(older, () => $appendToParagraph('omega', '!'));
  return {
    newer: lexicalTree(newer),
    newerYjs: yjsContent(newer),
    older: lexicalTree(older),
    olderErrors: older.errors,
    olderWarnings: older.warnings,
    olderYjs: yjsContent(older),
  };
}

// Recorded on `main`.
const EXPECTED: Record<string, Record<string, Outcome>> = {
  v1: {
    'a paragraph holding an unknown TextNode type': {
      newer: [
        'paragraph[text:alpha]',
        'paragraph[text:b ,test-mention:@m]',
        'paragraph[text:omega]',
      ],
      newerYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<paragraph>',
        '<text>',
        'b ',
        '<test-mention>',
        '@m',
        '<paragraph>',
        '<text>',
        'omega',
      ],
      older: [],
      olderErrors: [
        'Node test-mention is not registered',
        'no paragraph starting with omega',
      ],
      olderWarnings: [],
      olderYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<paragraph>',
        '<text>',
        'b ',
        '<test-mention>',
        '@m',
        '<paragraph>',
        '<text>',
        'omega',
      ],
    },
    'a paragraph holding an unknown inline element': {
      newer: [
        'paragraph[text:alpha]',
        'paragraph[text:c ,test-inline-tag[text:tag]]',
        'paragraph[text:omega]',
      ],
      newerYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<paragraph>',
        '<text>',
        'c ',
        '<test-inline-tag>',
        '<text>',
        'tag',
        '<paragraph>',
        '<text>',
        'omega',
      ],
      older: [],
      olderErrors: [
        'Node test-inline-tag is not registered',
        'no paragraph starting with omega',
      ],
      olderWarnings: [],
      olderYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<paragraph>',
        '<text>',
        'c ',
        '<test-inline-tag>',
        '<text>',
        'tag',
        '<paragraph>',
        '<text>',
        'omega',
      ],
    },
    'an unknown block': {
      newer: [
        'paragraph[text:alpha]',
        'test-callout[paragraph[text:inside]]',
        'paragraph[text:omega]',
      ],
      newerYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<test-callout>',
        '<paragraph>',
        '<text>',
        'inside',
        '<paragraph>',
        '<text>',
        'omega',
      ],
      older: [],
      olderErrors: [
        'Node test-callout is not registered',
        'no paragraph starting with omega',
      ],
      olderWarnings: [],
      olderYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<test-callout>',
        '<paragraph>',
        '<text>',
        'inside',
        '<paragraph>',
        '<text>',
        'omega',
      ],
    },
    'an unknown block and an unrelated edit in one update': {
      newer: [
        'paragraph[text:alpha beta]',
        'test-callout[paragraph[]]',
        'paragraph[text:omega]',
        'paragraph[text:tail]',
      ],
      newerYjs: [
        '<paragraph>',
        '<text>',
        'alpha beta',
        '<test-callout>',
        '<paragraph>',
        '<paragraph>',
        '<text>',
        'omega',
        '<paragraph>',
        '<text>',
        'tail',
      ],
      older: [],
      olderErrors: [
        'Node test-callout is not registered',
        'no paragraph starting with omega',
      ],
      olderWarnings: [],
      olderYjs: [
        '<paragraph>',
        '<text>',
        'alpha beta',
        '<test-callout>',
        '<paragraph>',
        '<paragraph>',
        '<text>',
        'omega',
        '<paragraph>',
        '<text>',
        'tail',
      ],
    },
    'an unknown slot value': {
      newer: [
        'paragraph[text:alpha]',
        'test-host[paragraph[text:body]]',
        'paragraph[text:omega]',
      ],
      newerYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<test-host>',
        '<paragraph>',
        '<text>',
        'body',
        '<paragraph>',
        '<text>',
        'omega',
      ],
      older: [],
      olderErrors: [
        'Node test-callout is not registered',
        'no paragraph starting with omega',
      ],
      olderWarnings: [],
      olderYjs: [
        '<paragraph>',
        '<text>',
        'alpha',
        '<test-host>',
        '<paragraph>',
        '<text>',
        'body',
        '<paragraph>',
        '<text>',
        'omega',
      ],
    },
  },
  v2: {
    'a paragraph holding an unknown TextNode type': {
      newer: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      newerYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
      older: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      olderErrors: [
        '$createTextNodesFromYText: Node test-mention is not registered',
      ],
      olderWarnings: [],
      olderYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
    },
    'a paragraph holding an unknown inline element': {
      newer: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      newerYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
      older: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      olderErrors: [
        '$createOrUpdateNodeFromYElement: Node test-inline-tag is not registered',
      ],
      olderWarnings: [],
      olderYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
    },
    'an unknown block': {
      newer: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      newerYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
      older: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      olderErrors: [
        '$createOrUpdateNodeFromYElement: Node test-callout is not registered',
      ],
      olderWarnings: [],
      olderYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
    },
    'an unknown block and an unrelated edit in one update': {
      newer: ['paragraph[text:alpha beta]', 'paragraph[text:omega!]'],
      newerYjs: ['<paragraph>', 'alpha beta', '<paragraph>', 'omega!'],
      older: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      olderErrors: [
        '$createOrUpdateNodeFromYElement: Node test-callout is not registered',
      ],
      olderWarnings: [],
      olderYjs: ['<paragraph>', 'alpha beta', '<paragraph>', 'omega!'],
    },
    'an unknown slot value': {
      newer: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      newerYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
      older: ['paragraph[text:alpha]', 'paragraph[text:omega!]'],
      olderErrors: [
        '$createOrUpdateNodeFromYElement: Node test-callout is not registered',
      ],
      olderWarnings: [],
      olderYjs: ['<paragraph>', 'alpha', '<paragraph>', 'omega!'],
    },
  },
};

describe.each([
  ['v1', false],
  ['v2', true],
])(
  'collab %s: default for node types one client does not register',
  (version, useCollabV2) => {
    afterEach(() => {
      vi.restoreAllMocks();
    });
    for (const [name, scenario] of Object.entries(SCENARIOS)) {
      test(name, () => {
        vi.spyOn(console, 'warn').mockImplementation(noop);
        const outcome = run(useCollabV2, scenario);
        expect(outcome).toEqual(EXPECTED[version][name]);
        expect(vi.mocked(console.warn)).not.toHaveBeenCalled();
      });
    }
  },
);
