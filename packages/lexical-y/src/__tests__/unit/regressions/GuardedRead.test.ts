/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// @vitest-environment node

// Every read of the binding goes through one fail-closed entry point
// (YBinding#guardedRead). These cases pin what it owns beyond the read
// itself: the local updates it commits before the read, a recovery that
// runs after the update the read is nested in, and a read that runs after
// the binding failed closed. Each case is named after its finding.

import * as Y from '@y/y';
import {$createTextNode, $getRoot} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {Reader} from '../../../internal/Read';
import {
  $block,
  $createBoxNode,
  $p,
  $selectIn,
  BoxNode,
  flush,
  freshReader,
  NODES,
  Peer,
  setup,
} from '../../utils/harness';

/** A network of its own, for a peer the case connects by hand. */
const network = (): ConstructorParameters<typeof Peer>[1] => ({
  delivery: 'causal',
  peers: [],
  pumping: false,
  queue: [],
});

/**
 * Run every microtask as usual, and collect what those that throw threw
 * (an error the binding rethrows in a microtask, which would otherwise be
 * an uncaught error).
 */
function catchMicrotasks(): unknown[] {
  const caught: unknown[] = [];
  const original = globalThis.queueMicrotask.bind(globalThis);
  vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(fn =>
    original(() => {
      try {
        fn();
      } catch (error) {
        caught.push(error);
      }
    }),
  );
  return caught;
}

afterEach(() => {
  vi.restoreAllMocks();
});

const LINE = 't1z t2z t3z t4z t5z t6z t7z t8z t9z';

function $selectWord(word: string) {
  const at = $block([0]).getTextContent().indexOf(word);
  return $selectIn([0], at, at + word.length);
}

describe('N4: a throw committing the updates pending before a read reaches no provider', () => {
  /**
   * A deletes `t2z` while B, offline, bolds `t7z` in an update still
   * pending when A's change arrives; `arm` makes the commit of B's update
   * throw. Requires: nothing thrown into the sync, B reads A's change, the
   * app's error is rethrown in a microtask, and B's next edit lands where B
   * made it, on every client.
   */
  async function run(
    arm: (b: Peer, error: Error) => void,
    onError: 'rethrows' | 'reports',
  ) {
    const t = await setup(() => $getRoot().append($p(LINE), $p('tail')));
    if (onError === 'reports') {
      t.b.editor._onError = e => void t.b.errors.push(e);
    }
    t.offline();
    t.a.update(() => void $selectWord('t2z').removeText());
    t.b.editor.update(() => void $selectWord('t7z').formatText('bold'));
    const error = new Error('app failure');
    arm(t.b, error);
    const caught = catchMicrotasks();
    await expect(t.sync()).resolves.toBeUndefined();
    expect(caught).toContain(error);
    expect(t.b.binding.status).toBe('active');
    expect(t.b.describe()).toBe((await freshReader(t.a)).describe());
    expect(t.b.describe()).not.toContain('t2z');
    t.b.update(() => void $selectWord('t5z').removeText());
    await t.sync();
    const fresh = await freshReader(t.a);
    expect(t.a.describe()).toBe(fresh.describe());
    expect(t.b.describe()).toBe(fresh.describe());
    expect(fresh.read(() => $getRoot().getTextContent())).toBe(
      't1z  t3z t4z  t6z t7z t8z t9z\n\ntail',
    );
  }

  describe.each(['rethrows', 'reports'] as const)('onError %s', onError => {
    test('N4: an update listener of the app throws on that commit', async () => {
      await run((b, error) => {
        let armed = true;
        b.editor.registerUpdateListener(() => {
          if (armed) {
            armed = false;
            throw error;
          }
        });
      }, onError);
    });
  });

  test('N4: an update an app listener queues throws, and onError rethrows', async () => {
    await run((b, error) => {
      let armed = true;
      b.editor.registerUpdateListener(() => {
        if (armed) {
          armed = false;
          b.editor.update(() => {
            $selectWord('t9z').removeText();
            throw error;
          });
        }
      });
    }, 'rethrows');
  });
});

describe('N5: a recovery nested in an update settles on the rebuild it runs', () => {
  /** Make every read of the reader throw, until restored. */
  function failEveryRead(): () => void {
    const proto = Reader.prototype;
    const {$apply, $readFull} = proto;
    proto.$apply = () => {
      throw new Error('reader failure');
    };
    proto.$readFull = () => {
      throw new Error('reader failure');
    };
    return () => {
      proto.$apply = $apply;
      proto.$readFull = $readFull;
    };
  }

  test.each(['a remote change', 'an undo'] as const)(
    'N5: %s read inside an app update, whose recovery fails too, fails closed',
    async entry => {
      const t = await setup(() => $getRoot().append($p('hello')));
      let update = new Uint8Array();
      if (entry === 'a remote change') {
        t.offline();
        t.b.update(() => void $block([0]).append($createTextNode(' remote')));
        update = Y.encodeStateAsUpdate(t.b.doc, Y.encodeStateVector(t.a.doc));
      } else {
        t.a.update(() => void $block([0]).append($createTextNode(' local')));
        expect(t.a.binding.undoManager!.canUndo()).toBe(true);
      }
      const shown = t.a.describe();
      const restore = failEveryRead();
      try {
        expect(() =>
          t.a.editor.update(
            () => {
              if (entry === 'a remote change') {
                Y.applyUpdate(t.a.doc, update);
              } else {
                t.a.binding.undo();
              }
            },
            {discrete: true},
          ),
        ).not.toThrow();
        await flush();
      } finally {
        restore();
      }
      expect(t.a.binding.status).toBe('readonly');
      expect(t.a.describe()).toBe(shown);
      expect(t.a.errors).toEqual([]);
      expect(t.a.warnings).toEqual([
        'the document cannot be read: reader failure',
      ]);
    },
  );

  test('N5: a remote change read inside an app update, recovered: warned once the rebuild committed', async () => {
    const t = await setup(() => $getRoot().append($p('hello')));
    t.offline();
    t.b.update(() => void $block([0]).append($createTextNode(' remote')));
    const update = Y.encodeStateAsUpdate(t.b.doc, Y.encodeStateVector(t.a.doc));
    const proto = Reader.prototype;
    const {$apply} = proto;
    proto.$apply = () => {
      throw new Error('reader failure');
    };
    const shownAtWarning: string[] = [];
    t.a.editor._onWarn = w => {
      shownAtWarning.push(`${(w as Error).message}: ${t.a.describe()}`);
    };
    try {
      t.a.editor.update(() => Y.applyUpdate(t.a.doc, update), {
        discrete: true,
      });
      await flush();
    } finally {
      proto.$apply = $apply;
    }
    expect(t.a.binding.status).toBe('active');
    expect(t.a.describe()).toBe('paragraph("hello remote")');
    expect(shownAtWarning).toEqual([
      'a remote change could not be read: reader failure: paragraph("hello remote")',
    ]);
  });
});

describe('N6: a read admitted before the binding failed closed reads nothing after it', () => {
  test('N6: a remote change an update listener applies while a failing read of the whole document waits', async () => {
    const author = new Peer(2, network());
    author.update(() =>
      $getRoot()
        .clear()
        .append($p('hello'), $createBoxNode('t').append($p('inside'))),
    );
    author.binding.initialize();
    await flush();
    // A reader without the box class: read only, still reading what changes.
    const reader = new Peer(
      1,
      network(),
      NODES.filter(k => k !== BoxNode),
    );
    Y.applyUpdate(reader.doc, Y.encodeStateAsUpdate(author.doc));
    reader.binding.initialize();
    await flush();
    expect(reader.binding.status).toBe('readonly');
    // A layout record this reader reads, which makes it read the whole
    // document again, and a content change after it.
    const seen = Y.encodeStateVector(reader.doc);
    author.doc.transact(() =>
      (author.doc.get('lexical-y') as Y.Node).setAttr('lexical-y:2', true),
    );
    const layout = Y.encodeStateAsUpdate(author.doc, seen);
    const afterLayout = Y.encodeStateVector(author.doc);
    author.update(() => void $block([0]).append($createTextNode(' remote')));
    await flush();
    const content = Y.encodeStateAsUpdate(author.doc, afterLayout);
    const shown = reader.describe();
    // The whole read fails once (the binding fails closed); before that
    // settles, an update listener applies the content change.
    const proto = Reader.prototype;
    const {$readFull} = proto;
    let failed = false;
    proto.$readFull = function (this: Reader, ...args) {
      if (!failed && this.state.doc === reader.doc) {
        failed = true;
        throw new Error('reader failure');
      }
      return $readFull.apply(this, args);
    };
    let applied = false;
    const off = reader.editor.registerUpdateListener(() => {
      if (failed && !applied) {
        applied = true;
        Y.applyUpdate(reader.doc, content);
      }
    });
    try {
      expect(() =>
        reader.editor.update(() => Y.applyUpdate(reader.doc, layout), {
          discrete: true,
        }),
      ).not.toThrow();
      await flush();
    } finally {
      off();
      proto.$readFull = $readFull;
    }
    expect(applied).toBe(true);
    expect(reader.warnings).toContain(
      'the document cannot be read: reader failure',
    );
    expect(reader.binding.status).toBe('readonly');
    expect(reader.describe()).toBe(shown);
    expect(shown).not.toContain('remote');
  });
});

describe('R2-1: a read runs only once no local update is pending or queued', () => {
  /**
   * A deletes the first character while B, offline, has a bold edit
   * pending; `arm` makes B's listeners queue local updates on that commit.
   */
  async function run(arm: (b: Peer) => void) {
    const t = await setup(() =>
      $getRoot().append($p('alpha beta gamma'), $p('tail')),
    );
    t.offline();
    t.a.update(() => void $selectIn([0], 0, 1).removeText());
    t.b.editor.update(() => void $selectWord('beta').formatText('bold'));
    arm(t.b);
    const caught = catchMicrotasks();
    await expect(t.sync()).resolves.toBeUndefined();
    await t.sync();
    const fresh = await freshReader(t.a);
    expect(t.b.binding.status).toBe('active');
    expect(t.a.describe()).toBe(fresh.describe());
    expect(t.b.describe()).toBe(fresh.describe());
    return {b: t.b, caught, fresh};
  }

  test('R2-1: an update listener queues a local update, then throws', async () => {
    const error = new Error('app failure');
    const {caught, fresh} = await run(b => {
      let armed = true;
      b.editor.registerUpdateListener(() => {
        if (armed) {
          armed = false;
          b.editor.update(() => void $getRoot().append($p('queued edit')));
          throw error;
        }
      });
    });
    expect(caught).toEqual([error]);
    expect(fresh.describe()).toContain('lpha');
    expect(fresh.describe()).not.toContain('alpha');
    expect(fresh.describe()).toContain('paragraph("queued edit")');
  });

  test('R2-1: listeners that queue local updates past the commits a read makes first: recovered, every update written', async () => {
    const {b, caught, fresh} = await run(peer => {
      // Each commit's listener queues the next update and throws, so that
      // each update waits for a commit of its own.
      let left = 20;
      peer.editor.registerUpdateListener(({tags}) => {
        if (left > 0 && !tags.has('collaboration')) {
          const n = left--;
          peer.editor.update(() => void $getRoot().append($p(`queued ${n}`)));
          throw new Error(`app failure ${n}`);
        }
      });
    });
    expect(caught).toHaveLength(20);
    for (let n = 1; n <= 20; n++) {
      expect(fresh.describe()).toContain(`paragraph("queued ${n}")`);
    }
    expect(b.warnings).toEqual([
      'a remote change could not be read: local updates were still pending after 16 commits',
    ]);
  });
});
