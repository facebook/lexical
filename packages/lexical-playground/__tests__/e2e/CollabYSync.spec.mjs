/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Collab Y (`@lexical/y`): clients that edit while disconnected (the
// toolbar's connect button) and reconnect, undo that only reverts the
// client's own changes, and the version gate.

import {expect} from '@playwright/test';

import {
  closeSessions,
  converge,
  finish,
  openClients,
  seed,
  tokens,
} from '../utils/collabY.mjs';
import {test} from '../utils/index.mjs';

test.skip(({isCollab}) => isCollab !== 'y', 'Requires collab Y (@lexical/y)');
test.afterEach(closeSessions);

test.describe('Collab Y: offline', () => {
  test('both sides edit text and structure while one is offline, then reconnect', async ({
    browser,
  }) => {
    const {clients} = await openClients(browser, {n: 3});
    const [a, b, c] = clients;
    await seed(clients, ['o1z o2z', 'o3z o4z', 'o5z']);
    await b.setOnline(false);
    // Online: A types in line 1 and splits line 2; C makes line 3 a heading.
    await a.caret('o1z');
    await a.type(' ka1z');
    await a.caret('o3z');
    await a.press('Enter');
    await a.type('ka2z ');
    await c.caret('o5z');
    await c.blockType('h1');
    await c.type(' kc1z');
    // Offline: B types in lines 1 and 2, and joins line 3 into line 2.
    await b.caret('o2z');
    await b.type(' kb1z');
    await b.caret('o4z');
    await b.type(' kb2z');
    await b.block(2, 'start');
    await b.press('Backspace');
    await b.type('kb3z ');
    await converge([a, c]);
    expect((await b.blocks()).join('|')).not.toContain('ka1z');
    expect((await a.blocks()).join('|')).not.toContain('kb1z');
    await b.setOnline(true);
    const {blocks} = await finish(clients, {
      present: [
        ...['o1z', 'o2z', 'o3z', 'o4z', 'o5z'],
        ...['ka1z', 'ka2z', 'kc1z', 'kb1z', 'kb2z', 'kb3z'],
      ],
    });
    expect(blocks[0]).toBe('paragraph:o1z ka1z o2z kb1z');
    expect(blocks.length).toBe(3);
  });

  test('large divergence: 30 lines on each side, lists, headings and joins', async ({
    browser,
  }) => {
    test.setTimeout(240000);
    const {clients} = await openClients(browser);
    const [a, b] = clients;
    const base = tokens('bl', 8);
    await seed(clients, base);
    await b.setOnline(false);
    // A appends 30 lines, makes a list of lines 2-4, a heading of line 6,
    // and types in every line.
    const ta = tokens('ka', 30);
    await a.block(7, 'end');
    for (const t of ta) {
      await a.press('Enter');
      await a.type(t, 0);
    }
    await a.range('bl2z', 'bl4z');
    await a.blockType('bullet-list');
    await a.caret('bl6z');
    await a.blockType('h2');
    const tx = tokens('kx', 8);
    for (let i = 0; i < 8; i++) {
      await a.caret(base[i]);
      await a.type(` ${tx[i]}`, 0);
    }
    // B, offline, prepends 30 lines, types in every line, joins two pairs
    // of lines and splits line 3.
    const tb = tokens('kb', 30);
    await b.block(0, 'start');
    for (const t of tb) {
      await b.type(t, 0);
      await b.press('Enter');
    }
    const ty = tokens('ky', 8);
    for (let i = 0; i < 8; i++) {
      await b.caret(base[i], 'before');
      await b.type(`${ty[i]} `, 0);
    }
    for (const i of [5, 7]) {
      await b.caret(ty[i], 'before');
      await b.press('Backspace');
    }
    await b.caret('bl3z');
    await b.press('Enter');
    await b.type('kb31z', 0);
    await b.setOnline(true);
    await finish(clients, {
      present: [...base, ...ta, ...tb, ...tx, ...ty, 'kb31z'],
    });
  });
});

test.describe('Collab Y: undo isolation', () => {
  test('undo and redo own typing after a peer typed in the same line', async ({
    browser,
  }) => {
    const {clients} = await openClients(browser);
    const [a, b] = clients;
    await seed(clients, ['u1z u2z']);
    await a.caret('u2z');
    await a.type(' ka1z');
    await a.stopCapturing();
    await converge(clients);
    await b.caret('u1z', 'before');
    await b.type('kb1z ');
    await b.caret('ka1z');
    await b.type(' kb2z');
    await converge(clients);
    await a.undo();
    await converge(clients);
    expect(await a.blocks()).toEqual(['paragraph:kb1z u1z u2z kb2z']);
    await a.redo();
    await converge(clients);
    expect(await a.blocks()).toEqual(['paragraph:kb1z u1z u2z ka1z kb2z']);
    await a.undo();
    await finish(clients, {
      absent: ['ka1z'],
      present: ['u1z', 'u2z', 'kb1z', 'kb2z'],
    });
  });

  test('undo of Enter and a heading keeps a peer’s edits in those lines', async ({
    browser,
  }) => {
    const {clients} = await openClients(browser);
    const [a, b] = clients;
    await seed(clients, ['s1z s2z', 's3z']);
    await a.caret('s1z');
    await a.press('Enter');
    await a.stopCapturing();
    await a.caret('s3z');
    await a.blockType('h1');
    await a.stopCapturing();
    await converge(clients);
    await b.caret('s2z');
    await b.type(' kb1z');
    await b.caret('s3z');
    await b.type(' kb2z');
    await converge(clients);
    await a.undo();
    await converge(clients);
    expect(await a.blocks()).toEqual([
      'paragraph:s1z',
      'paragraph: s2z kb1z',
      'paragraph:s3z kb2z',
    ]);
    await a.undo();
    await converge(clients);
    expect(await a.blocks()).toEqual([
      'paragraph:s1z s2z kb1z',
      'paragraph:s3z kb2z',
    ]);
    await a.redo();
    await a.redo();
    const {blocks} = await finish(clients, {
      present: ['s1z', 's2z', 's3z', 'kb1z', 'kb2z'],
    });
    expect(blocks).toEqual([
      'paragraph:s1z',
      'paragraph: s2z kb1z',
      'heading/h1:s3z kb2z',
    ]);
  });

  test('undo while a peer types inside the text being undone', async ({
    browser,
  }) => {
    const {clients, session} = await openClients(browser);
    const [a, b] = clients;
    await seed(clients, ['c1z', 'c2z']);
    await a.caret('c1z');
    await a.type(' ka1z ka2z');
    await a.stopCapturing();
    await converge(clients);
    await b.caret('ka1z');
    await session.delay();
    await Promise.all([a.undo(), b.type(' kb1z kb2z', 30)]);
    const {blocks} = await finish(clients, {
      absent: ['ka2z'],
      present: ['c1z', 'c2z', 'kb1z', 'kb2z'],
    });
    expect(blocks[0]).toContain('kb1z kb2z');
  });
});

test.describe('Collab Y: version gate', () => {
  test('a client that does not support the document’s layout is read only', async ({
    browser,
  }) => {
    const {clients, session} = await openClients(browser);
    const [a, b] = clients;
    session.expect(/@lexical\/y: the document uses layout 3, not one/);
    await seed(clients, ['g1z']);
    // A newer client marks the document with a newer layout version (the
    // root's `lexical-y` attribute). This binding reads layouts 1 and 2 (2
    // marks a document with move records or lifted blocks), so 3 is one it
    // does not support.
    await a.evaluate(() => {
      const editor = document.querySelector(
        '[data-lexical-editor]',
      ).__lexicalEditor;
      const {binding} =
        editor[
          Symbol.for('@lexical/extension/LexicalBuilder')
        ].extensionNameMap.get('@lexical/y/Collab').state.output;
      binding.doc.transact(() => binding.root.setAttr('lexical-y', 3));
    });
    // Clients that are open become read only...
    for (const c of [a, b]) {
      await expect.poll(() => c.status()).toBe('readonly');
      await expect(c.editor).toHaveAttribute('contenteditable', 'false');
      await expect(c.page.locator('.collab-y-notice')).toBeVisible();
    }
    // ...and so does a client that loads the document afterwards.
    const late = await session.open('L', {status: 'readonly'});
    await expect(late.editor).toHaveAttribute('contenteditable', 'false');
    await expect(late.page.locator('.collab-y-notice')).toBeVisible();
    expect(await late.blocks()).toEqual(['paragraph:g1z']);
    // Typing changes nothing.
    await b.editor.click({force: true});
    await b.type('kb1z');
    await late.editor.click({force: true});
    await late.type('kl1z');
    await b.page.waitForTimeout(300);
    for (const c of [a, b, late]) {
      expect(await c.blocks()).toEqual(['paragraph:g1z']);
      expect(c.problems).toEqual([]);
    }
  });
});
