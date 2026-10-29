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

import {$getRoot} from 'lexical';
import {afterEach, describe, expect, test, vi} from 'vitest';

import {
  $block,
  $p,
  $selectIn,
  freshReader,
  type Peer,
  setup,
} from '../../utils/harness';

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
