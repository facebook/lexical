/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createHeadingNode} from '@lexical/rich-text';
import * as Y from '@y/y';
import {
  $createParagraphNode,
  $createTextNode,
  $getEditor,
  $getRoot,
  $getState,
  $isTextNode,
  $parseSerializedNode,
  $setState,
  createState,
  defineExtension,
  type LexicalEditor,
  LexicalWarning,
} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {LAYOUT_VERSION, YBinding} from '../..';
import {
  editYState,
  readYState,
  seedYState,
  YHeadlessError,
} from '../../headless';
import {
  createHeadlessYEditor,
  MAX_FOLLOW_UPS,
} from '../../internal/HeadlessEditor';
import {
  $block,
  $p,
  $selectIn,
  describeNode,
  expectConverged,
  NODES,
  type Peer,
  setup,
} from '../utils/harness';

// The tests turn the binding's self-check on (it is off by default): a
// mismatch is a warning, so the tests that expect none catch it.
const config = {nodes: NODES, selfCheck: true};

/** Run microtasks collected by a spy; the messages of those that throw. */
function rethrown(tasks: (() => void)[]): string[] {
  const out: string[] = [];
  for (const task of tasks.splice(0)) {
    try {
      task();
    } catch (e) {
      out.push((e as Error).message);
    }
  }
  return out;
}

// Like a block id extension: every top-level block gets a random id, given
// in an update scheduled by an update listener (so on open, too).
const bidState = createState('bid', {
  parse: v => (typeof v === 'string' ? v : ''),
});
let nextBid = 0;
const BidExtension = defineExtension({
  name: 'test-bid',
  nodes: NODES,
  register: editor =>
    editor.registerUpdateListener(({editorState}) => {
      const missing = editorState.read(() =>
        $getRoot()
          .getChildren()
          .some(node => $getState(node, bidState) === ''),
      );
      if (missing) {
        editor.update(() => {
          for (const node of $getRoot().getChildren()) {
            if ($getState(node, bidState) === '') {
              $setState(node, bidState, `b${nextBid++}`);
            }
          }
        });
      }
    }),
});
const bidConfig = {extensions: [BidExtension], selfCheck: true};
const $bids = () =>
  $getRoot()
    .getChildren()
    .map(node => $getState(node, bidState))
    .join(',');

const $describe = () => $getRoot().getChildren().map(describeNode).join(' / ');

function seed(...lines: string[]): Uint8Array {
  return seedYState(config, () => {
    for (const line of lines) {
      $getRoot().append($p(line));
    }
  });
}

function caught(fn: () => unknown): YHeadlessError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(YHeadlessError);
    return error as YHeadlessError;
  }
  throw new Error('expected a YHeadlessError');
}

/** Client ids of every struct an update carries. */
function clientsOf(update: Uint8Array): number[] {
  const {structs} = Y.decodeUpdate(update);
  return [...new Set(structs.map(s => s.id.client))];
}

function applyTo(peers: Peer[], update: Uint8Array) {
  for (const peer of peers) {
    Y.applyUpdate(peer.doc, update, 'server');
  }
}

describe('@lexical/y/headless', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('seed, edit and read round trip', () => {
    const state = seed('Hello');
    expect(readYState(state, config, $describe)).toBe('paragraph("Hello")');
    const {update, state: next} = editYState(state, config, () => {
      (
        $block([0]).getFirstChild() as ReturnType<typeof $createTextNode>
      ).spliceText(5, 0, ', world');
      $getRoot().append($p('Second'));
    });
    expect(update).not.toBeNull();
    expect(readYState(next, config, $describe)).toBe(
      'paragraph("Hello, world") / paragraph("Second")',
    );
    // The state is the stored state with the update merged in.
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state);
    Y.applyUpdate(doc, update!);
    expect(
      readYState(Y.encodeStateAsUpdate(doc), config, () =>
        $getEditor().getEditorState().toJSON(),
      ),
    ).toEqual(
      readYState(next, config, () => $getEditor().getEditorState().toJSON()),
    );
  });

  test('identical seeds give the same bytes and merge into one copy', () => {
    expect(seed('a', 'b')).toEqual(seed('a', 'b'));
    expect(seed('a', 'b')).not.toEqual(seed('a', 'c'));
    const merged = Y.mergeUpdates([
      seed('a', 'b') as Uint8Array<ArrayBuffer>,
      seed('a', 'b') as Uint8Array<ArrayBuffer>,
    ]);
    expect(readYState(merged, config, $describe)).toBe(
      'paragraph("a") / paragraph("b")',
    );
  });

  test('an edit with no change returns no update', () => {
    const state = seed('same');
    const result = editYState(state, config, () => {});
    expect(result.update).toBeNull();
    expect(result.state).toBe(state);
  });

  test('an error thrown by the edit is rethrown and nothing is returned', () => {
    const state = seed('keep');
    expect(() =>
      editYState(state, config, () => {
        $getRoot().clear();
        throw new Error('refused');
      }),
    ).toThrow('refused');
    expect(readYState(state, config, $describe)).toBe('paragraph("keep")');
  });

  for (const order of ['server first', 'peers first'] as const) {
    test(`a server edit merges with concurrent peer edits (${order})`, async () => {
      const t = await setup(() => {
        $getRoot().append($p('one'), $p('two'));
      });
      const state = Y.encodeStateAsUpdate(t.a.doc);
      t.offline();
      t.a.update(() => $selectIn([0], 3).insertText(' A'));
      t.b.update(() => $selectIn([1], 0).insertText('B '));
      const {update} = editYState(state, config, () => {
        $getRoot().append($p('three'));
        (
          $block([0]).getFirstChild() as ReturnType<typeof $createTextNode>
        ).spliceText(0, 0, 'S ');
      });
      if (order === 'server first') {
        applyTo(t.peers, update!);
        await t.sync();
      } else {
        await t.sync();
        applyTo(t.peers, update!);
        await t.sync();
      }
      await expectConverged(
        t.peers,
        'paragraph("S one A") / paragraph("B two") / paragraph("three")',
      );
      // The server's own copy (stored state, the peers' updates, its update)
      // reads the same.
      const stored = Y.mergeUpdates([
        Y.encodeStateAsUpdate(t.a.doc),
        Y.encodeStateAsUpdate(t.b.doc),
        update as Uint8Array<ArrayBuffer>,
      ]);
      expect(readYState(stored, config, $describe)).toBe(t.a.describe());
    });
  }

  test('an edit to a block a peer is typing in keeps their text', async () => {
    const t = await setup(() => $getRoot().append($p('hello world')));
    const state = Y.encodeStateAsUpdate(t.a.doc);
    t.offline();
    // The peer types in the middle of the line, character by character.
    for (const ch of [' ', 'b', 'i', 'g']) {
      const at = t.b.read(() => $getRoot().getTextContent().indexOf(' world'));
      t.b.update(() => $selectIn([0], at).insertText(ch));
    }
    // The server replaces the last word and turns the line into a heading.
    const {update} = editYState(state, config, () => {
      const text = $block([0]).getFirstChild();
      if (!$isTextNode(text)) {
        throw new Error('expected text');
      }
      text.spliceText(6, 5, 'there');
      $block([0]).replace($createHeadingNode('h2'), true);
    });
    applyTo([t.a], update!);
    await t.sync();
    await expectConverged(t.peers, 'heading[h2]("hello big there")');
  });

  test('an update to a root that is not allowed is refused', () => {
    const state = seed('x');
    const error = caught(() =>
      editYState(state, config, () => {}, {
        transact: doc => doc.get('elsewhere').setAttr('k', 1),
      }),
    );
    expect(error.code).toBe('foreign-roots');
    expect(error.message).toContain('elsewhere');
    // Allowed explicitly, it goes through with the edit in one update.
    const {update, state: next} = editYState(
      state,
      config,
      () => $getRoot().append($p('y')),
      {
        allowedRoots: ['lexical-y', 'activity'],
        transact: doc => doc.get('activity').setAttr('last', 'agent'),
      },
    );
    const doc = new Y.Doc();
    Y.applyUpdate(doc, next);
    expect(doc.get('activity').getAttr('last')).toBe('agent');
    expect(readYState(next, config, $describe)).toBe(
      'paragraph("x") / paragraph("y")',
    );
    expect(update).not.toBeNull();
  });

  test("clientIDRange 'uint32' keeps every client id in 32 bits", () => {
    const state = seedYState({...config, clientIDRange: 'uint32'}, () =>
      $getRoot().append($p('a')),
    );
    expect(clientsOf(state).every(id => id <= 0xffffffff)).toBe(true);
    for (let i = 0; i < 20; i++) {
      const {update} = editYState(
        state,
        {...config, clientIDRange: 'uint32'},
        () => $getRoot().append($p(`edit ${i}`)),
      );
      expect(clientsOf(update!).every(id => id <= 0xffffffff)).toBe(true);
    }
    // Yjs 14's default ids are 53-bit.
    const {update} = editYState(state, config, () =>
      $getRoot().append($p('wide')),
    );
    expect(clientsOf(update!).some(id => id > 0xffffffff)).toBe(true);
  });

  test('a document with a newer layout is read only and refused', () => {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, seed('future'));
    doc.get('lexical-y').setAttr('lexical-y', LAYOUT_VERSION + 1);
    const state = Y.encodeStateAsUpdate(doc);
    for (const fn of [
      () => editYState(state, config, () => $getRoot().append($p('x'))),
      () => readYState(state, config, $describe),
      () => createHeadlessYEditor({...config, state}),
    ]) {
      const error = caught(fn);
      expect(error.code).toBe('read-only');
      expect(error.message).toContain(
        `the document uses layout ${LAYOUT_VERSION + 1}`,
      );
    }
  });

  test('an empty state is not initialized', () => {
    const empty = Y.encodeStateAsUpdate(new Y.Doc());
    expect(caught(() => editYState(empty, config, () => {})).code).toBe(
      'not-initialized',
    );
    expect(caught(() => readYState(empty, config, $describe)).code).toBe(
      'not-initialized',
    );
    // A pending handle can be seeded by hand.
    using handle = createHeadlessYEditor(config);
    expect(handle.binding.status).toBe('pending');
    handle.editor.update(() => $getRoot().clear().append($p('by hand')), {
      discrete: true,
    });
    handle.binding.initialize();
    expect(
      readYState(Y.encodeStateAsUpdate(handle.doc), config, $describe),
    ).toBe('paragraph("by hand")');
  });

  test('dispose leaves no listeners on the editor or the document', () => {
    // What the binding and the helpers registered: compared with a bare
    // document and a bare editor of the same config (Yjs and Lexical keep
    // some registrations of their own).
    const docListeners = (doc: Y.Doc): string[] => {
      const observers = (
        doc as unknown as {_observers: Map<string, Set<unknown>>}
      )._observers;
      return [...observers]
        .filter(([, set]) => set.size > 0)
        .map(([name, set]) => `${name}:${set.size}`)
        .sort();
    };
    const editorListeners = (editor: LexicalEditor): string[] => [
      ...Object.entries(editor._listeners)
        .filter(([, set]) => set.size > 0)
        .map(([name, set]) => `${name}:${set.size}`),
      ...[...editor._commands].map(
        ([, byPriority]) =>
          `command:${byPriority.reduce((n, set) => n + set.size, 0)}`,
      ),
      ...[...editor._nodes]
        .filter(([, registered]) => registered.transforms.size > 0)
        .map(([type, registered]) => `${type}:${registered.transforms.size}`),
    ];
    const bareEditor = buildEditorFromExtensions(
      defineExtension({name: 'bare', nodes: NODES}),
    );
    bareEditor.dispose();
    const expectedEditor = editorListeners(bareEditor);
    const expectedDoc = docListeners(new Y.Doc());

    const atDestroy: string[][] = [];
    const destroy = Y.Doc.prototype.destroy;
    vi.spyOn(Y.Doc.prototype, 'destroy').mockImplementation(function (
      this: Y.Doc,
    ) {
      atDestroy.push(docListeners(this));
      destroy.call(this);
    });
    const editors: LexicalEditor[] = [];
    const state = seed('a');
    editYState(state, {...config, clientIDRange: 'uint32'}, () => {
      editors.push($getEditor());
      $getRoot().append($p('b'));
    });
    readYState(state, config, () => {
      editors.push($getEditor());
    });
    const handle = createHeadlessYEditor({...config, state});
    editors.push(handle.editor);
    handle.dispose();
    // Idempotent.
    handle.dispose();
    // The seed's document (and the scratch document of its initialization),
    // the edit's, the read's and the handle's.
    expect(atDestroy.length).toBe(5);
    for (const listeners of atDestroy) {
      expect(listeners).toEqual(expectedDoc);
    }
    for (const editor of editors) {
      expect(editorListeners(editor)).toEqual(expectedEditor);
      expect(editor._recordNodeMoves).toBe(bareEditor._recordNodeMoves);
    }
    expect(handle.doc.isDestroyed).toBe(true);
  });

  test('updates scheduled by an edit are part of its update', () => {
    const state = seedYState(bidConfig, () => $getRoot().append($p('a')));
    const seeded = readYState(state, bidConfig, $bids);
    expect(seeded).toMatch(/^b\d+$/);
    // Stored: every read agrees.
    expect(readYState(state, bidConfig, $bids)).toBe(seeded);
    const {state: next} = editYState(state, bidConfig, () =>
      $getRoot().append($p('b')),
    );
    const ids = readYState(next, bidConfig, $bids);
    expect(ids).toMatch(/^b\d+,b\d+$/);
    expect(ids.startsWith(seeded + ',')).toBe(true);
    expect(readYState(next, bidConfig, $bids)).toBe(ids);
  });

  test('values assigned on open are stored by a no-op edit, not by a read', () => {
    // A document stored without ids.
    const state = seed('a', 'b');
    // Each read assigns ids that are never stored.
    const first = readYState(state, bidConfig, $bids);
    expect(first).not.toBe('');
    expect(readYState(state, bidConfig, $bids)).not.toBe(first);
    // A no-op edit returns what opening writes; once stored, reads agree.
    const repair = editYState(state, bidConfig, () => {});
    expect(repair.update).not.toBeNull();
    const ids = readYState(repair.state, bidConfig, $bids);
    expect(readYState(repair.state, bidConfig, $bids)).toBe(ids);
    expect(editYState(repair.state, bidConfig, () => {}).update).toBeNull();
  });

  test('warnings are reported and never refuse an edit', () => {
    const state = seed('a');
    const reported: LexicalWarning[] = [];
    const {update, warnings} = editYState(
      state,
      {...config, onWarn: warning => reported.push(warning)},
      () => {
        $getRoot().append($p('b'));
        $getEditor()._onWarn(new Error('a warning'));
      },
    );
    expect(update).not.toBeNull();
    expect(warnings.map(w => [w.code, w.message])).toEqual([
      ['@lexical/y/editor-warning', 'a warning'],
    ]);
    expect(warnings[0]).toBeInstanceOf(LexicalWarning);
    expect((warnings[0].data as {error: Error}).error.message).toBe(
      'a warning',
    );
    expect(reported).toEqual(warnings);
    // A LexicalWarning is passed on as it is.
    const own = new LexicalWarning('@example/app/odd', 'an app warning', 1);
    expect(
      editYState(state, {...config, onWarn: () => {}}, () =>
        $getEditor()._onWarn(own),
      ).warnings,
    ).toEqual([own]);
    // A handler that throws does not refuse the edit either: its error is
    // rethrown in a microtask, outside the helpers.
    const later: (() => void)[] = [];
    const microtask = vi
      .spyOn(globalThis, 'queueMicrotask')
      .mockImplementation(fn => later.push(fn));
    let thrown;
    try {
      thrown = editYState(
        state,
        {
          ...config,
          onWarn: () => {
            throw new Error('handler failure');
          },
        },
        () => {
          $getRoot().append($p('c'));
          $getEditor()._onWarn(new Error('a warning'));
        },
      );
    } finally {
      microtask.mockRestore();
    }
    expect(thrown.update).not.toBeNull();
    expect(thrown.warnings.map(w => w.message)).toEqual(['a warning']);
    expect(rethrown(later)).toEqual(['handler failure']);
    // The same in production.
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const prod = editYState(
        state,
        {...config, onWarn: warning => reported.push(warning)},
        () => {
          $getRoot().append($p('b'));
          $getEditor()._onWarn(new Error('a production warning'));
        },
      );
      expect(prod.update).not.toBeNull();
      expect(prod.warnings.map(w => [w.code, w.message])).toEqual([
        ['@lexical/y/editor-warning', 'a production warning'],
      ]);
      expect(reported.map(w => w.message)).toEqual([
        'a warning',
        'a production warning',
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
    // Without onWarn: console.warn outside production.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    editYState(state, config, () => {
      $getEditor()._onWarn(new Error('to the console'));
    });
    expect(warn).toHaveBeenCalledWith('to the console');
    // The reason a document is read only is reported, with the binding's
    // code.
    const doc = new Y.Doc();
    Y.applyUpdate(doc, state);
    doc.get('lexical-y').setAttr('lexical-y', LAYOUT_VERSION + 1);
    const readOnly: LexicalWarning[] = [];
    expect(
      caught(() =>
        readYState(
          Y.encodeStateAsUpdate(doc),
          {...config, onWarn: warning => readOnly.push(warning)},
          $describe,
        ),
      ).code,
    ).toBe('read-only');
    expect(readOnly.map(w => w.code)).toEqual([
      '@lexical/y/unsupported-layout',
    ]);
    expect(readOnly[0].data).toEqual({
      layout: LAYOUT_VERSION + 1,
      legacyRoots: [],
    });
    expect(readOnly[0].message).toContain(
      `the document uses layout ${LAYOUT_VERSION + 1}`,
    );
  });

  test('listeners that never stop scheduling updates are reported', () => {
    // Every committed update schedules another that changes the document,
    // so the follow-ups never run out.
    const tickState = createState('tick', {
      parse: v => (typeof v === 'number' ? v : 0),
    });
    let scheduled = 0;
    const Endless = defineExtension({
      name: 'test-endless',
      nodes: NODES,
      register: editor =>
        editor.registerUpdateListener(() => {
          scheduled++;
          editor.update(() => {
            const first = $getRoot().getFirstChild();
            if (first !== null) {
              $setState(first, tickState, scheduled);
            }
          });
        }),
    });
    const endless = {extensions: [Endless], selfCheck: true};
    const state = seed('a');
    const reported: LexicalWarning[] = [];
    const {update, warnings} = editYState(
      state,
      {...endless, onWarn: warning => reported.push(warning)},
      () => $getRoot().append($p('b')),
    );
    // The edit itself goes through.
    expect(update).not.toBeNull();
    const next = Y.mergeUpdates([state, update!] as Uint8Array<ArrayBuffer>[]);
    expect(readYState(next, config, $describe)).toBe(
      'paragraph("a") / paragraph("b")',
    );
    // Once for opening and once for the edit; each stops after the cap.
    expect(warnings.map(w => w.code)).toEqual([
      '@lexical/y/follow-ups-exhausted',
      '@lexical/y/follow-ups-exhausted',
    ]);
    expect(warnings[0].data).toEqual({limit: MAX_FOLLOW_UPS});
    expect(warnings[0].message).toContain(`${MAX_FOLLOW_UPS} follow-up`);
    expect(reported).toEqual(warnings);
    // Bounded: the binding's first read, then opening's and the edit's
    // update, each with its follow-ups.
    expect(scheduled).toBeLessThanOrEqual(1 + 2 * (MAX_FOLLOW_UPS + 1));
    // Listeners that settle are not reported.
    expect(
      editYState(state, bidConfig, () => $getRoot().append($p('b'))).warnings,
    ).toEqual([]);
  });

  test('a seed merged next to an older layout converts the document', () => {
    // A stored document with content in the @lexical/yjs (v2) root.
    const legacy = new Y.Doc();
    legacy.get('root-v2').insert(0, [new Y.Node('paragraph')]);
    const stored = Y.encodeStateAsUpdate(legacy);
    // A client does not initialize it (it would hide the old content).
    const blocked = new Y.Doc();
    Y.applyUpdate(blocked, stored);
    const codes: string[] = [];
    const editor = buildEditorFromExtensions(
      defineExtension({
        name: 'client',
        nodes: NODES,
        onWarn: warning =>
          codes.push(warning instanceof LexicalWarning ? warning.code : ''),
      }),
    );
    const binding = new YBinding(editor, blocked, {selfCheck: true});
    binding.start();
    binding.initialize();
    expect(binding.status).toBe('readonly');
    expect(codes).toEqual(['@lexical/y/unsupported-layout']);
    binding.dispose();
    editor.dispose();
    // The converter loads the old document into an editor (here, content
    // it holds), seeds that content and merges the seed into the stored
    // document.
    const source = buildEditorFromExtensions(
      defineExtension({name: 'source', nodes: NODES}),
    );
    source.update(() => $getRoot().clear().append($p('converted')), {
      discrete: true,
    });
    const json = source.getEditorState().toJSON();
    source.dispose();
    const converted = Y.mergeUpdates([
      stored,
      seedYState(config, () => {
        for (const child of json.root.children) {
          $getRoot().append($parseSerializedNode(child));
        }
      }),
    ] as Uint8Array<ArrayBuffer>[]);
    expect(readYState(converted, config, $describe)).toBe(
      'paragraph("converted")',
    );
    // The old root is left as it was.
    const after = new Y.Doc();
    Y.applyUpdate(after, converted);
    expect(after.get('root-v2').toString()).toBe(
      legacy.get('root-v2').toString(),
    );
  });

  test('extensions define the editor', () => {
    const state = seedYState(
      {extensions: [{dependencies: [], name: 'app', nodes: NODES}]},
      () => {
        $getRoot().append(
          $createHeadingNode('h1').append($createTextNode('Title')),
          $createParagraphNode(),
        );
      },
    );
    expect(readYState(state, config, $describe)).toBe(
      'heading[h1]("Title") / paragraph()',
    );
  });
});
