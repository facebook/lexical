/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {afterEach, beforeEach, describe, expect, test} from 'vitest';

import {
  type CursorHighlightSheetBinding,
  getCursorHighlightSheet,
} from '../../SyncCursors';

// Runs in a real browser (vitest browser mode) because getCursorHighlightSheet
// uses constructable stylesheets and `adoptedStyleSheets` on Document and
// ShadowRoot — APIs jsdom does not implement.

function makeBinding(rootElement: HTMLElement): CursorHighlightSheetBinding {
  return {
    cursorHighlightSheet: null,
    editor: {getRootElement: () => rootElement},
  };
}

describe('getCursorHighlightSheet', () => {
  const created: HTMLElement[] = [];
  let documentSheets: readonly CSSStyleSheet[];

  beforeEach(() => {
    documentSheets = document.adoptedStyleSheets;
  });
  afterEach(() => {
    // Restore the document's sheets and detach anything these tests created so
    // adoptions don't leak across tests sharing the page.
    document.adoptedStyleSheets = documentSheets;
    for (const el of created.splice(0)) {
      el.remove();
    }
  });

  test('adopts the sheet into the document for a light-DOM editor', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    created.push(root);

    const sheet = getCursorHighlightSheet(makeBinding(root));
    expect(document.adoptedStyleSheets).toContain(sheet);
  });

  test('re-homes the cached sheet when the editor root moves into a shadow root', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    created.push(root);
    const binding = makeBinding(root);

    const sheet = getCursorHighlightSheet(binding);
    expect(document.adoptedStyleSheets).toContain(sheet);

    // Shadow-DOM toggle: move the same root into an open shadow root without
    // recreating the binding. The cached sheet must follow it into the shadow
    // scope; otherwise ::highlight() rules no longer reach the moved ranges and
    // remote-cursor highlights stop rendering.
    const host = document.createElement('div');
    document.body.appendChild(host);
    created.push(host);
    const shadow = host.attachShadow({mode: 'open'});
    shadow.appendChild(root);

    const sheetAfterToggle = getCursorHighlightSheet(binding);
    expect(sheetAfterToggle).toBe(sheet); // same cached sheet
    expect(shadow.adoptedStyleSheets).toContain(sheet); // re-homed
  });

  test('does not duplicate the sheet on repeated calls in the same scope', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    created.push(root);
    const binding = makeBinding(root);

    const sheet = getCursorHighlightSheet(binding);
    getCursorHighlightSheet(binding);
    getCursorHighlightSheet(binding);

    expect(
      document.adoptedStyleSheets.filter((s) => s === sheet).length,
    ).toBe(1);
  });
});
