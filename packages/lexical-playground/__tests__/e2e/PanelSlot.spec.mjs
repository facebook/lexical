/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToEditorBeginning} from '../keyboardShortcuts/index.mjs';
import {
  click,
  evaluate,
  expect,
  focusEditor,
  initialize,
  sleep,
  test,
  waitForSelector,
} from '../utils/index.mjs';

async function insertPanel(page) {
  await page.keyboard.type('/panel');
  await waitForSelector(page, '.typeahead-popover');
  await page.keyboard.press('Enter');
}

const PARA = '⏎';

async function regionText(page, selector) {
  return evaluate(
    page,
    ([sel, para]) => {
      const region = document.querySelector(sel);
      if (region == null) {
        return null;
      }
      return Array.from(region.querySelectorAll('p'))
        .map(p => p.textContent)
        .join(para);
    },
    [selector, PARA],
  );
}

// The Panel is an ElementNode whose presentation is React chrome: the host
// shell is contentEditable=false, and the chrome attaches the editable
// regions — the named `title` slot (useLexicalSlot) and the getDOMSlot body
// children element — using the same render-hidden-then-attach technique.
test.describe('Panel React-chromed ElementNode', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    return initialize({isCollab, page});
  });

  test('inserts a Panel with React chrome and both regions visible', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPanel(page);
    await waitForSelector(page, '.lexical-panel-chrome');

    // The shell is non-editable chrome; the regions flip back to editable.
    const shellEditable = await evaluate(page, () => {
      return document.querySelector('.lexical-panel-node').contentEditable;
    });
    expect(shellEditable).toBe('false');
    const regions = await evaluate(page, () => {
      const title = document.querySelector(
        '.lexical-panel-title [data-lexical-slot="title"]',
      );
      const children = document.querySelector(
        '.lexical-panel-body .lexical-panel-children',
      );
      return {
        childrenDisplay: children && children.style.display,
        childrenEditable: children && children.contentEditable,
        titleDisplay: title && title.style.display,
        titleEditable: title && title.contentEditable,
      };
    });
    expect(regions.titleDisplay).toBe('');
    expect(regions.titleEditable).toBe('true');
    expect(regions.childrenDisplay).toBe('');
    expect(regions.childrenEditable).toBe('true');

    expect(
      await regionText(
        page,
        '.lexical-panel-title [data-lexical-slot="title"]',
      ),
    ).toBe('Panel Title');
    expect(
      await regionText(page, '.lexical-panel-body .lexical-panel-children'),
    ).toBe('Panel body');
  });

  test('typing inside the title slot replaces only its text', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPanel(page);
    await waitForSelector(page, '.lexical-panel-chrome');

    await click(page, '.lexical-panel-title [data-lexical-slot="title"] p');
    await sleep(100);
    await page.keyboard.press('ControlOrMeta+a');
    await sleep(120);
    await page.keyboard.type('New Title');
    await sleep(120);

    expect(
      await regionText(
        page,
        '.lexical-panel-title [data-lexical-slot="title"]',
      ),
    ).toBe('New Title');
    expect(
      await regionText(page, '.lexical-panel-body .lexical-panel-children'),
    ).toBe('Panel body');
  });

  test('typing inside the body children replaces only its text', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPanel(page);
    await waitForSelector(page, '.lexical-panel-chrome');

    // Note: Cmd+A in the body stays document-scoped by design (the body is
    // the ordinary child channel, not a slot frame), so extend instead.
    await click(page, '.lexical-panel-body .lexical-panel-children p');
    await sleep(100);
    await page.keyboard.press('End');
    await page.keyboard.type(' extended');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second');
    await sleep(120);

    expect(
      await regionText(page, '.lexical-panel-body .lexical-panel-children'),
    ).toBe(`Panel body extended${PARA}Second`);
    expect(
      await regionText(
        page,
        '.lexical-panel-title [data-lexical-slot="title"]',
      ),
    ).toBe('Panel Title');
  });

  test('document text outside the Panel stays editable around it', async ({
    page,
  }) => {
    await focusEditor(page);
    await insertPanel(page);
    await waitForSelector(page, '.lexical-panel-chrome');

    await moveToEditorBeginning(page);
    await page.keyboard.type('Before');
    await sleep(120);
    expect(
      await evaluate(page, () => {
        return document.querySelector(
          '[contenteditable="true"][data-lexical-editor="true"]',
        ).textContent;
      }),
    ).toContain('Before');
    expect(
      await regionText(
        page,
        '.lexical-panel-title [data-lexical-slot="title"]',
      ),
    ).toBe('Panel Title');
  });
});
