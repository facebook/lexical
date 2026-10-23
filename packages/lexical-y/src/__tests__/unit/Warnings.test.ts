/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

import * as Y from '@y/y';
import {
  $createTextNode,
  $getRoot,
  $isElementNode,
  createEditor,
  type LexicalEditor,
  LexicalWarning,
} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  RECOVERED_READ_WARNING,
  RECOVERED_WRITE_WARNING,
  SELF_CHECK_WARNING,
  UNSUPPORTED_LAYOUT_WARNING,
  YBinding,
  type YBindingOptions,
} from '../..';
import {Reader} from '../../internal/Read';
import {Writer} from '../../internal/Write';
import {$p, NODES} from '../utils/harness';

// The self-check is forced to find a mismatch (`mismatch.on`): these tests
// are about where its findings go.
const mismatch = vi.hoisted(() => ({on: false}));
vi.mock('../../internal/SelfCheck', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../internal/SelfCheck')>();
  return {
    ...actual,
    $checkWrite: (...args: Parameters<typeof actual.$checkWrite>) =>
      mismatch.on ? ['forced mismatch'] : actual.$checkWrite(...args),
    checkContainer: (...args: Parameters<typeof actual.checkContainer>) =>
      mismatch.on ? ['forced mismatch'] : actual.checkContainer(...args),
  };
});

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

type Seen = {
  warning: LexicalWarning;
  /** Whether a Yjs transaction (or its cleanup: observers) was running. */
  inTransaction: boolean;
  /** The editor's text when the warning arrived. */
  text: string;
};

/**
 * A client whose editor's onWarn records each warning (with what was going
 * on when it arrived); `onWarn` replaces that handler (null: Lexical's
 * default, which throws in development).
 */
function peer(
  clientID: number,
  options: YBindingOptions = {selfCheck: true},
  onWarn?: ((error: Error) => void) | null,
) {
  const doc = new Y.Doc({gc: false});
  doc.clientID = clientID;
  const seen: Seen[] = [];
  const editor: LexicalEditor = createEditor({
    namespace: 'w',
    nodes: NODES,
    onError: e => {
      throw e;
    },
    onWarn:
      onWarn === null
        ? undefined
        : onWarn ||
          (e => {
            expect(e).toBeInstanceOf(LexicalWarning);
            seen.push({
              inTransaction:
                doc._transaction !== null ||
                doc._transactionCleanups.length > 0,
              text: text(editor),
              warning: e as LexicalWarning,
            });
          }),
  });
  const binding = new YBinding(editor, doc, options);
  binding.start();
  const codes = () => seen.map(s => s.warning.code);
  return {binding, codes, doc, editor, seen};
}

const text = (editor: LexicalEditor) =>
  editor.getEditorState().read(() => $getRoot().getTextContent());

/** Two synced peers sharing `hello` (b reads what a initialized). */
function pair(
  options: YBindingOptions = {selfCheck: true},
  onWarn?: ((error: Error) => void) | null,
) {
  const a = peer(1, options, onWarn);
  a.editor.update(() => $getRoot().clear().append($p('hello')), {
    discrete: true,
  });
  a.binding.initialize();
  const b = peer(2, options, onWarn);
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
  b.binding.initialize();
  a.doc.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== 'net') {
      Y.applyUpdate(b.doc, u, 'net');
    }
  });
  b.doc.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== 'net') {
      Y.applyUpdate(a.doc, u, 'net');
    }
  });
  return {a, b};
}

const $typeAtEnd = (s: string) => {
  const p = $getRoot().getFirstChild();
  if ($isElementNode(p)) {
    p.append($createTextNode(s));
  }
};

const env = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = env;
  mismatch.on = false;
});

describe('@lexical/y warnings', () => {
  test('a local self-check mismatch goes to the editor onWarn as a LexicalWarning', () => {
    const {a, b} = pair();
    mismatch.on = true;
    expect(() =>
      a.editor.update(() => $typeAtEnd(' there'), {discrete: true}),
    ).not.toThrow();
    mismatch.on = false;
    expect(a.codes()).toEqual([SELF_CHECK_WARNING]);
    expect(a.codes()).toEqual(['@lexical/y/self-check']);
    const {warning} = a.seen[0];
    expect(warning.message).toContain('forced mismatch');
    expect(warning.data).toEqual({
      problems: ['forced mismatch'],
      remote: false,
    });
    expect(a.seen[0].inTransaction).toBe(false);
    expect(b.seen).toEqual([]);
  });

  test('a remote self-check mismatch is reported after the change is applied, and the container is read again', () => {
    const {a, b} = pair();
    // A structural change: the remote check compares whole containers.
    mismatch.on = true;
    expect(() =>
      a.editor.update(() => $getRoot().append($p('there')), {discrete: true}),
    ).not.toThrow();
    mismatch.on = false;
    const remote = b.seen.find(s => s.warning.code === SELF_CHECK_WARNING)!;
    expect(remote.warning.message).toContain('(remote)');
    expect(remote.warning.data).toMatchObject({remote: true});
    // Not from inside Yjs, and the remote change is already in the editor.
    expect(remote.inTransaction).toBe(false);
    expect(remote.text).toBe('hello\n\nthere');
    expect(text(b.editor)).toBe('hello\n\nthere');
  });

  test('the self-check is off unless enabled, in development and production', () => {
    for (const nodeEnv of ['development', 'production']) {
      process.env.NODE_ENV = nodeEnv;
      for (const selfCheck of [undefined, false, true]) {
        const {a, b} = pair({selfCheck});
        mismatch.on = true;
        a.editor.update(() => $typeAtEnd(' there'), {discrete: true});
        a.editor.update(() => $getRoot().append($p('more')), {
          discrete: true,
        });
        mismatch.on = false;
        expect([...a.codes(), ...b.codes()].length > 0).toBe(
          selfCheck === true,
        );
      }
    }
  });

  test('read only, recovery: each warning has its code and data', () => {
    // A newer layout.
    const newer = new Y.Doc();
    newer.get('lexical-y').setAttr('lexical-y', 99);
    const n = peer(3);
    Y.applyUpdate(n.doc, Y.encodeStateAsUpdate(newer));
    expect(n.binding.status).toBe('readonly');
    expect(n.codes()).toEqual([UNSUPPORTED_LAYOUT_WARNING]);
    expect(n.seen[0].warning.data).toEqual({layout: 99, legacyRoots: []});
    expect(n.seen[0].inTransaction).toBe(false);

    // A remote read that throws.
    const {a, b} = pair();
    const proto = Reader.prototype as unknown as {
      $apply: (...args: unknown[]) => void;
    };
    const apply = proto.$apply;
    proto.$apply = function () {
      throw new Error('simulated reader failure');
    };
    try {
      a.editor.update(() => $typeAtEnd(' there'), {discrete: true});
    } finally {
      proto.$apply = apply;
    }
    expect(b.codes()).toEqual([RECOVERED_READ_WARNING]);
    expect((b.seen[0].warning.data as {error: Error}).error.message).toBe(
      'simulated reader failure',
    );
    // Reported once the editor was rebuilt.
    expect(b.seen[0].text).toBe('hello there');
    expect(text(b.editor)).toBe('hello there');

    // A local write that throws.
    const wproto = Writer.prototype as unknown as {$run: () => void};
    const run = wproto.$run;
    let calls = 0;
    wproto.$run = function (this: Writer) {
      if (++calls === 1) {
        throw new Error('simulated writer failure');
      }
      return run.call(this);
    };
    try {
      a.editor.update(() => $typeAtEnd('!'), {discrete: true});
    } finally {
      wproto.$run = run;
    }
    expect(a.codes()).toEqual([RECOVERED_WRITE_WARNING]);
    expect((a.seen[0].warning.data as {error: Error}).error.message).toBe(
      'simulated writer failure',
    );
    expect(text(b.editor)).toBe('hello there!');
  });

  for (const handler of ['a throwing onWarn', "Lexical's default onWarn"]) {
    test(`${handler} does not break syncing`, () => {
      // The handler's error is rethrown in a microtask (outside Yjs and the
      // provider): collected here instead.
      const later: (() => void)[] = [];
      const microtask = vi
        .spyOn(globalThis, 'queueMicrotask')
        .mockImplementation(fn => later.push(fn));
      try {
        const onWarn =
          handler === 'a throwing onWarn'
            ? (e: Error) => {
                throw new Error('handler failure: ' + e.message);
              }
            : null;
        const {a, b} = pair({selfCheck: true}, onWarn);
        // Both sides find a mismatch: a local one on a, a remote one on b
        // (which b reports after reading the change in full).
        mismatch.on = true;
        expect(() =>
          a.editor.update(() => $getRoot().append($p('one')), {
            discrete: true,
          }),
        ).not.toThrow();
        mismatch.on = false;
        // Lexical schedules with microtasks too: the ones that throw are
        // the handler's errors, one per warning (a's local, b's remote).
        const errors = rethrown(later);
        expect(errors.length).toBe(2);
        for (const message of errors) {
          expect(message).toMatch(
            handler === 'a throwing onWarn'
              ? /^handler failure: @lexical\/y self-check/
              : /^@lexical\/y self-check/,
          );
        }
        // Syncing goes on, both ways.
        expect(text(b.editor)).toBe('hello\n\none');
        a.editor.update(() => $typeAtEnd(' two'), {discrete: true});
        b.editor.update(() => $getRoot().append($p('three')), {
          discrete: true,
        });
        expect(text(a.editor)).toBe('hello two\n\none\n\nthree');
        expect(text(b.editor)).toBe(text(a.editor));
        expect(a.binding.status).toBe('active');
        expect(b.binding.status).toBe('active');
        // A read-only warning from a throwing handler still leaves the
        // binding read only.
        const newer = new Y.Doc();
        newer.get('lexical-y').setAttr('lexical-y', 99);
        const n = peer(3, {}, onWarn);
        expect(() =>
          Y.applyUpdate(n.doc, Y.encodeStateAsUpdate(newer)),
        ).not.toThrow();
        expect(n.binding.status).toBe('readonly');
        expect(rethrown(later)).toEqual([
          expect.stringContaining('the document uses layout 99'),
        ]);
      } finally {
        microtask.mockRestore();
      }
    });
  }

  test('a handler that edits the editor sees the binding consistent', () => {
    let edited = false;
    const {a, b} = pair({selfCheck: true}, () => {
      if (!edited) {
        edited = true;
        b.editor.update(() => $getRoot().append($p('from the handler')), {
          discrete: true,
        });
      }
    });
    mismatch.on = true;
    a.editor.update(() => $getRoot().append($p('one')), {discrete: true});
    mismatch.on = false;
    expect(edited).toBe(true);
    expect(text(a.editor)).toBe(text(b.editor));
    expect(text(a.editor)).toContain('from the handler');
  });

  test('public fields are read only', () => {
    const {a} = pair();
    expect(a.binding.status).toBe('active');
    expect(() => {
      (a.binding as unknown as {status: string}).status = 'readonly';
    }).toThrow();
    expect(() => {
      (a.binding as unknown as {undoManager: null}).undoManager = null;
    }).toThrow();
    expect(a.binding.status).toBe('active');
    expect(a.binding.undoManager).not.toBe(null);
    expect([...a.binding.pins.keys()]).toContain('paragraph');
  });
});
