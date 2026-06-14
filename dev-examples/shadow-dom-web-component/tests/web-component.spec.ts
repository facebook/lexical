/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, Locator, Page, test} from '@playwright/test';

const editor = (page: Page, name: string): Locator =>
  page.locator(`lexical-editor[name="${name}"] [data-lexical-editor]`);

async function clearAndType(
  page: Page,
  name: string,
  text: string,
): Promise<void> {
  await editor(page, name).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.locator('lexical-editor').first().waitFor();
});

test('renders two editors, each in its own open shadow root', async ({
  page,
}) => {
  await expect(page.locator('lexical-editor')).toHaveCount(2);

  const stats = await page.evaluate(() => {
    const elements = [...document.querySelectorAll('lexical-editor')];
    return {
      // querySelector does not pierce shadow roots, so none of the
      // contentEditables should be reachable from the document.
      lightDomContentEditables: document.querySelectorAll(
        'div[contenteditable="true"]',
      ).length,
      total: elements.length,
      withShadow: elements.filter(el => el.shadowRoot !== null).length,
    };
  });
  expect(stats).toEqual({
    lightDomContentEditables: 0,
    total: 2,
    withShadow: 2,
  });
});

test('types and formats inside a web component shadow root', async ({page}) => {
  await clearAndType(page, 'notes', 'hello world');
  await expect(editor(page, 'notes')).toHaveText('hello world');

  // Select "world" and bold it with the in-shadow toolbar button.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+ArrowLeft');
  }
  const boldButton = page
    .locator('lexical-editor[name="notes"] .toolbar button')
    .first();
  await boldButton.click();

  await expect(editor(page, 'notes').locator('strong')).toHaveText('world');
  // The toolbar reflects the selection's format, proving the selection is
  // readable inside the shadow root.
  await expect(boldButton).toHaveAttribute('aria-pressed', 'true');
});

test('the two editors are independent', async ({page}) => {
  await clearAndType(page, 'notes', 'first editor');
  await clearAndType(page, 'summary', 'second editor');
  await expect(editor(page, 'notes')).toHaveText('first editor');
  await expect(editor(page, 'summary')).toHaveText('second editor');
});

test('deletes by word inside the shadow root', async ({page}) => {
  await clearAndType(page, 'notes', 'hello world');
  // Lexical's word-delete shortcut is `Alt+Backspace` on macOS and
  // `Ctrl+Backspace` elsewhere — Playwright's `ControlOrMeta` alias
  // maps to `Meta` on macOS, which is the OS "delete to start of line".
  const wordDelete =
    process.platform === 'darwin' ? 'Alt+Backspace' : 'Control+Backspace';
  await page.keyboard.press(wordDelete);
  await expect(editor(page, 'notes')).toHaveText('hello ');
});

test('is form-associated via ElementInternals', async ({page}) => {
  await clearAndType(page, 'notes', 'form value one');
  await clearAndType(page, 'summary', 'form value two');

  await page.locator('button[type="submit"]').click();

  // The form value of each editor is its serialized Lexical state, collected
  // by FormData without any hidden <input>.
  const output = page.locator('#form-output');
  await expect(output).toContainText('notes:');
  await expect(output).toContainText('summary:');
  await expect(output).toContainText('form value one');
  await expect(output).toContainText('form value two');
});

test('dispatches a composed input event across the shadow boundary', async ({
  page,
}) => {
  await clearAndType(page, 'summary', 'x');
  // The page-level (light DOM) listener observes the composed `input` event
  // dispatched from inside the shadow root.
  await expect(page.locator('#last-edited')).toHaveText('Last edited: summary');
});

test('a slotted light-DOM button drives the editor through the host API', async ({
  page,
}) => {
  await clearAndType(page, 'notes', 'will be cleared');
  await expect(editor(page, 'notes')).toHaveText('will be cleared');

  // The Clear button is declared as `<button slot="toolbar-extra">` in the
  // page's light DOM. Despite living outside the shadow root, it renders
  // visually inside the editor's toolbar, and its click handler calls into
  // the editor through the public host API.
  const clear = page.locator('[data-clear]');
  await expect(clear).toBeVisible();

  // The button itself stays in the light DOM (querySelector reaches it
  // directly), the toolbar's built-in buttons do not.
  const distribution = await page.evaluate(() => {
    const slotted = document.querySelector('[data-clear]') as
      | (Element & {assignedSlot: HTMLSlotElement | null})
      | null;
    const slot = slotted !== null ? slotted.assignedSlot : null;
    return {
      assignedToToolbarSlot: slot !== null ? slot.name : null,
      reachableFromLightDom: slotted !== null,
    };
  });
  expect(distribution).toEqual({
    assignedToToolbarSlot: 'toolbar-extra',
    reachableFromLightDom: true,
  });

  await clear.click();
  await expect(editor(page, 'notes')).toHaveText('');
});

test('the page themes each editor through inherited CSS custom properties', async ({
  page,
}) => {
  // The page restyles only the summary editor by redefining the editor's
  // exposed custom properties. Inherited properties cross the shadow
  // boundary on their own — the internal layout is never touched.
  const colors = await page.evaluate(() => {
    const get = (host: Element): {bg: string; fg: string} => {
      const style = getComputedStyle(host);
      return {
        bg: style.getPropertyValue('--lexical-bg').trim(),
        fg: style.getPropertyValue('--lexical-fg').trim(),
      };
    };
    const notes = document.querySelector('lexical-editor[name="notes"]')!;
    const summary = document.querySelector('lexical-editor[name="summary"]')!;
    return {notes: get(notes), summary: get(summary)};
  });

  // Light defaults from the shadow root's :host rule.
  expect(colors.notes.bg).toBe('#fff');
  expect(colors.notes.fg).toBe('#1f2328');

  // Dark overrides from the page applied through inheritance.
  expect(colors.summary.bg).toBe('#1c1d22');
  expect(colors.summary.fg).toBe('#e6e6e9');
});

test('readonly blocks edits but still submits the value', async ({page}) => {
  await clearAndType(page, 'summary', 'locked content');

  // Flip the host's `readonly` attribute via the page-level checkbox. The
  // editor observes the attribute change and tells Lexical to stop
  // accepting input.
  await page.locator('#summary-readonly').check();
  await page.keyboard.type(' more typing');
  await expect(editor(page, 'summary')).toHaveText('locked content');

  // The form still has the original value — `readonly` keeps the field in
  // FormData, matching `<input readonly>`.
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#form-output')).toContainText('summary:');
  await expect(page.locator('#form-output')).toContainText('locked content');

  // Removing the attribute re-enables editing.
  await page.locator('#summary-readonly').uncheck();
  await editor(page, 'summary').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' resumed');
  await expect(editor(page, 'summary')).toHaveText('locked content resumed');
});

test('disabled drops the editor out of form submission', async ({page}) => {
  await clearAndType(page, 'summary', 'will be dropped');

  // Set the standard `disabled` attribute via the host element's IDL
  // property. Lexical stops accepting input and the browser drops the
  // field from FormData entirely, matching `<input disabled>`.
  await page.evaluate(() => {
    const host = document.querySelector(
      'lexical-editor[name="summary"]',
    ) as HTMLElement & {disabled: boolean};
    host.disabled = true;
  });

  // Typing has no effect once the editor is disabled.
  await editor(page, 'summary').click({force: true});
  await page.keyboard.type(' still typing');
  await expect(editor(page, 'summary')).toHaveText('will be dropped');

  await page.locator('button[type="submit"]').click();
  const output = await page.locator('#form-output').textContent();
  expect(output).toContain('notes:');
  expect(output).not.toContain('summary:');
});

test('the floating popover anchors to the shadow-root selection', async ({
  page,
}) => {
  await clearAndType(page, 'notes', 'select these words');
  // Select the last word so the popover has a non-zero rect to anchor to.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+ArrowLeft');
  }

  const popover = page.locator('#format-popover');

  // The popover lives in the light DOM and opts into the popover API's
  // top layer. It must be visible and anchored inside the viewport.
  await expect(popover).toBeVisible();
  const geometry = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('#format-popover')!;
    const editorRect = document
      .querySelector('lexical-editor[name="notes"]')!
      .getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      editorBottom: editorRect.bottom,
      editorLeft: editorRect.left,
      editorRight: editorRect.right,
      isOpen: el.matches(':popover-open'),
      popoverLeft: rect.left,
      popoverTop: rect.top,
    };
  });
  expect(geometry.isOpen).toBe(true);
  // The popover anchors near the selected text inside the editor.
  expect(geometry.popoverLeft).toBeGreaterThanOrEqual(geometry.editorLeft - 1);
  expect(geometry.popoverLeft).toBeLessThan(geometry.editorRight);
  // The popover sits below the selection, which is inside the editor's
  // contentEditable, so it ends up no higher than the editor's top.
  expect(geometry.popoverTop).toBeGreaterThan(0);

  // Clicking a button drives the editor through the host's public API.
  await popover.locator('button[data-format="bold"]').click();
  await expect(editor(page, 'notes').locator('strong')).toHaveText('words');

  // Clicking back into the editor drops the caret there, which Lexical
  // reports as a collapsed range selection. The editor publishes
  // `lexical-selection-rect` with a null rect and the popover hides.
  await editor(page, 'notes').click({position: {x: 50, y: 50}});
  await expect(popover).toBeHidden();
});

test('mirrors aria-label and aria-invalid onto the contentEditable', async ({
  page,
}) => {
  const readAria = (name: string) =>
    page.evaluate(n => {
      const host = document.querySelector(
        `lexical-editor[name="${n}"]`,
      ) as Element & {shadowRoot: ShadowRoot};
      const ce = host.shadowRoot.querySelector('[data-lexical-editor]')!;
      return {
        ariaInvalid: ce.getAttribute('aria-invalid'),
        ariaLabel: ce.getAttribute('aria-label'),
        ariaMultiline: ce.getAttribute('aria-multiline'),
        role: ce.getAttribute('role'),
      };
    }, name);

  // aria-label flows from the host attribute to the contentEditable;
  // role and aria-multiline are spelled out for assistive tech.
  expect(await readAria('notes')).toEqual({
    ariaInvalid: 'false',
    ariaLabel: 'Notes editor',
    ariaMultiline: 'true',
    role: 'textbox',
  });
  expect(await readAria('summary')).toEqual({
    ariaInvalid: 'false',
    ariaLabel: 'Summary editor',
    ariaMultiline: 'true',
    role: 'textbox',
  });

  // Emptying the required notes editor flips aria-invalid to true.
  await editor(page, 'notes').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  expect((await readAria('notes')).ariaInvalid).toBe('true');
});

test('a visible error message follows the required validation state', async ({
  page,
}) => {
  const error = page.locator('#notes-error');
  // The notes editor starts with placeholder text, so the page-level
  // error message is hidden.
  await expect(error).toBeHidden();

  // Emptying the editor makes the host fire `lexical-validity-change`
  // with valid=false; the page-level listener shows the message.
  await editor(page, 'notes').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await expect(error).toBeVisible();
  await expect(error).toHaveText('Please fill in this field.');

  // Typing again hides the message.
  await page.keyboard.type('filled in');
  await expect(error).toBeHidden();
});

test('dir on the host flips writing direction inside the shadow root', async ({
  page,
}) => {
  await page.locator('#summary-rtl').check();
  const directions = await page.evaluate(() => {
    const host = document.querySelector(
      'lexical-editor[name="summary"]',
    ) as Element & {shadowRoot: ShadowRoot};
    const ce = host.shadowRoot.querySelector(
      '[data-lexical-editor]',
    ) as HTMLElement;
    return {
      ceDir: window.getComputedStyle(ce).direction,
      hostDir: host.getAttribute('dir'),
    };
  });
  // The inherited `dir` attribute crosses into the shadow root without
  // any explicit forwarding — the contentEditable's computed direction
  // follows the host.
  expect(directions).toEqual({ceDir: 'rtl', hostDir: 'rtl'});

  await page.locator('#summary-rtl').uncheck();
  const ltr = await page.evaluate(() => {
    const host = document.querySelector(
      'lexical-editor[name="summary"]',
    ) as Element & {shadowRoot: ShadowRoot};
    const ce = host.shadowRoot.querySelector(
      '[data-lexical-editor]',
    ) as HTMLElement;
    return window.getComputedStyle(ce).direction;
  });
  expect(ltr).toBe('ltr');
});

test('a required <lexical-editor> participates in form validation', async ({
  page,
}) => {
  // The notes editor in index.html is marked `required`. Out of the box its
  // editor state has no text content, so the form should refuse to submit.
  await editor(page, 'notes').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');

  const initialState = await page.evaluate(() => {
    const form = document.querySelector('form')!;
    const notes = document.querySelector(
      'lexical-editor[name="notes"]',
    ) as HTMLElement & {
      validity: ValidityState;
      willValidate: boolean;
    };
    return {
      formValid: form.checkValidity(),
      notesMatchesInvalid: notes.matches(':invalid'),
      notesValueMissing: notes.validity.valueMissing,
      notesWillValidate: notes.willValidate,
    };
  });
  expect(initialState).toEqual({
    formValid: false,
    notesMatchesInvalid: true,
    notesValueMissing: true,
    notesWillValidate: true,
  });

  // Clicking submit on an invalid form does not run the submit handler, so
  // `#form-output` stays empty.
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#form-output')).toHaveText('');

  // Once the user types something, the editor becomes valid and the form
  // submits.
  await editor(page, 'notes').click();
  await page.keyboard.type('now filled in');
  const filledState = await page.evaluate(() => {
    const notes = document.querySelector(
      'lexical-editor[name="notes"]',
    ) as HTMLElement & {validity: ValidityState};
    return {
      notesMatchesInvalid: notes.matches(':invalid'),
      notesValueMissing: notes.validity.valueMissing,
    };
  });
  expect(filledState).toEqual({
    notesMatchesInvalid: false,
    notesValueMissing: false,
  });

  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#form-output')).toContainText('now filled in');
});
