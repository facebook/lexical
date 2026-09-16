/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  defineExtension,
  type LexicalEditor,
  type RangeSelection,
  type SerializedEditorState,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

import {
  $createPageNumberNode,
  $getPageHeader,
  $setPageHeader,
  $setPageSetup,
  $setPageSlotContent,
  buildHeaderFooterEditor,
  CLOSE_PAGE_SLOT_COMMAND,
  computeGeometry,
  DEFAULT_PAGE_SETUP,
  DEFAULT_SLOT_SETUP,
  EDIT_PAGE_SLOT_COMMAND,
  type PageSetup,
  PagesExtension,
} from '../../plugins/PagesExtension';

const LINE_HEIGHT = 20;
const HEADER_SETUP: PageSetup = {
  ...DEFAULT_PAGE_SETUP,
  header: {...DEFAULT_SLOT_SETUP, enabled: true},
  margins: {bottom: 0.4, left: 0.4, right: 0.4, top: 0.4},
  orientation: 'portrait',
  pageSize: 'Statement',
};
const LINES_PER_PAGE = Math.floor(
  computeGeometry(HEADER_SETUP, 0, 0, 24).contentHeight / LINE_HEIGHT,
);

function nextFrames(count: number): Promise<void> {
  return new Promise(resolve => {
    const step = (n: number) =>
      n === 0 ? resolve() : requestAnimationFrame(() => step(n - 1));
    step(count);
  });
}

function mount() {
  const style = document.createElement('style');
  style.textContent = `
    .ContentEditable__root, .Pages__slotContent { font: 16px/${LINE_HEIGHT}px monospace; position: relative; outline: 0; }
    .ContentEditable__root p, .Pages__slotContent p { margin: 0; }
  `;
  const viewport = document.createElement('div');
  viewport.style.width = '800px';
  const host = document.createElement('div');
  const root = document.createElement('div');
  root.className = 'ContentEditable__root';
  root.contentEditable = 'true';
  host.appendChild(root);
  viewport.appendChild(host);
  document.body.append(style, viewport);
  const editor: LexicalEditorWithDispose = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension, PagesExtension],
      name: 'PagesHeaderFooter.test',
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    viewport.remove();
    style.remove();
  });
  return {editor, host, root};
}

/** Serialize a header made of one paragraph, optionally with a page number. */
function slotState(
  parent: LexicalEditor,
  text: string,
  withPageNumber = false,
): SerializedEditorState {
  const nested = buildHeaderFooterEditor(parent);
  nested.update(
    () => {
      const paragraph = $createParagraphNode().append($createTextNode(text));
      if (withPageNumber) {
        paragraph.append($createPageNumberNode());
      }
      $getRoot().clear().append(paragraph);
    },
    {discrete: true},
  );
  const state = nested.getEditorState().toJSON();
  nested.dispose();
  return state;
}

function $fillLines(count: number) {
  const root = $getRoot();
  root.clear();
  for (let i = 0; i < count; i++) {
    root.append($createParagraphNode().append($createTextNode(`line ${i}`)));
  }
}

function headerSlots(host: HTMLElement) {
  return Array.from(
    host.querySelectorAll<HTMLElement>('[data-page-slot="header"]'),
  );
}

function headerTexts(host: HTMLElement) {
  return headerSlots(host).map(slot => slot.textContent);
}

describe('Pages headers and footers', () => {
  test('clones the header onto every page and follows the page count', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE * 2 + 5);
        $setPageSetup(HEADER_SETUP);
        $setPageHeader(slotState(editor, 'Hello'));
      },
      {discrete: true},
    );
    await expect
      .poll(() => headerTexts(host))
      .toEqual(['Hello', 'Hello', 'Hello']);
    await expect
      .poll(() =>
        parseFloat(host.style.getPropertyValue('--page-header-height')),
      )
      .toBeGreaterThan(0);
    // Header slots reserve space, so the same lines now need more pages.
    editor.update(() => $fillLines(LINES_PER_PAGE * 3 + 5), {discrete: true});
    await expect.poll(() => headerTexts(host).length).toBeGreaterThanOrEqual(4);
    expect(new Set(headerTexts(host))).toEqual(new Set(['Hello']));

    // Disabling headers empties the slots and frees the space.
    editor.update(
      () => $setPageSetup({...HEADER_SETUP, header: DEFAULT_SLOT_SETUP}),
      {discrete: true},
    );
    await expect
      .poll(() => host.style.getPropertyValue('--page-header-height'))
      .toBe('0px');
    expect(
      headerSlots(host).every(slot => slot.dataset.pageSlotEnabled === 'false'),
    ).toBe(true);
    expect(new Set(headerTexts(host))).toEqual(new Set(['']));
  });

  test('shows first-page and even-page variants where configured', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE * 3 + 5);
        $setPageSetup({
          ...HEADER_SETUP,
          header: {
            differentEvenPages: true,
            differentFirstPage: true,
            enabled: true,
          },
        });
        $setPageSlotContent('header', 'default', slotState(editor, 'Default'));
        $setPageSlotContent('header', 'first', slotState(editor, 'First'));
        $setPageSlotContent('header', 'even', slotState(editor, 'Even'));
      },
      {discrete: true},
    );
    await expect.poll(() => headerTexts(host).length).toBeGreaterThanOrEqual(4);
    const byIndex = () =>
      Object.fromEntries(
        headerSlots(host).map(slot => [
          slot.dataset.pageIndex,
          slot.textContent,
        ]),
      );
    await expect.poll(() => byIndex()['0']).toBe('First');
    expect(byIndex()['1']).toBe('Even');
    expect(byIndex()['2']).toBe('Default');
    expect(byIndex()['3']).toBe('Even');

    // Editing "by variant" opens the first page that shows it.
    const {activeSlot} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;
    expect(
      editor.dispatchCommand(EDIT_PAGE_SLOT_COMMAND, {
        kind: 'header',
        variant: 'even',
      }),
    ).toBe(true);
    expect(activeSlot.value).toEqual({
      kind: 'header',
      pageIndex: 1,
      variant: 'even',
    });
    editor.dispatchCommand(CLOSE_PAGE_SLOT_COMMAND, undefined);

    editor.update(
      () =>
        $setPageSetup({
          ...HEADER_SETUP,
          header: {
            differentEvenPages: false,
            differentFirstPage: true,
            enabled: true,
          },
        }),
      {discrete: true},
    );
    await expect.poll(() => byIndex()['1']).toBe('Default');
    expect(byIndex()['0']).toBe('First');
    // No page shows the even variant any more.
    expect(
      editor.dispatchCommand(EDIT_PAGE_SLOT_COMMAND, {
        kind: 'header',
        variant: 'even',
      }),
    ).toBe(false);
  });

  test('edits one live header and mirrors it into the clones', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE * 2 + 5);
        $setPageSetup(HEADER_SETUP);
        $setPageHeader(slotState(editor, 'Hello'));
      },
      {discrete: true},
    );
    await expect.poll(() => headerTexts(host).length).toBe(3);
    const {activeSlot, activeSlotEditor} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;

    let parentUpdates = 0;
    onTestFinished(
      editor.registerUpdateListener(({dirtyElements, dirtyLeaves}) => {
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          parentUpdates++;
        }
      }),
    );

    expect(
      editor.dispatchCommand(EDIT_PAGE_SLOT_COMMAND, {
        kind: 'header',
        pageIndex: 1,
      }),
    ).toBe(true);
    expect(activeSlot.value).toEqual({
      kind: 'header',
      pageIndex: 1,
      variant: 'default',
    });
    const slot1 = host.querySelector<HTMLElement>(
      '[data-page-slot="header"][data-page-index="1"]',
    )!;
    expect(slot1.querySelector('[contenteditable="true"]')).not.toBeNull();
    expect(slot1.classList.contains('Pages__slot--live')).toBe(true);

    const nested = activeSlotEditor.value!;
    nested.update(
      () => {
        $getRoot().getFirstChild()!.selectEnd().insertText(' world');
      },
      {discrete: true},
    );
    // Other pages update live, the edited slot keeps the live editor.
    await expect
      .poll(() =>
        headerSlots(host)
          .filter(slot => slot !== slot1)
          .map(slot => slot.textContent),
      )
      .toEqual(['Hello world', 'Hello world']);
    expect(slot1.textContent).toBe('Hello world');

    expect(editor.dispatchCommand(CLOSE_PAGE_SLOT_COMMAND, undefined)).toBe(
      true,
    );
    expect(activeSlot.value).toBeNull();
    expect(activeSlotEditor.value).toBeNull();
    expect(slot1.querySelector('[contenteditable="true"]')).toBeNull();

    // The slot that was live no longer advertises itself as empty.
    expect(slot1.dataset.empty).toBe('false');

    // A single click on a slot opens it too (no double-click required), and
    // the caret lands where the click was: between "Hel" and "lo".
    const slot2 = host.querySelector<HTMLElement>(
      '[data-page-slot="header"][data-page-index="2"]',
    )!;
    // caretPositionFromPoint only resolves points inside the viewport.
    slot2.scrollIntoView({block: 'center'});
    const textNode = slot2.querySelector('span')!.firstChild!;
    const probe = document.createRange();
    probe.setStart(textNode, 3);
    probe.setEnd(textNode, 3);
    const rect = probe.getBoundingClientRect();
    slot2.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left,
        clientY: rect.top + rect.height / 2,
      }),
    );
    expect(activeSlot.value?.pageIndex).toBe(2);
    expect(slot2.querySelector('[contenteditable="true"]')).not.toBeNull();
    activeSlotEditor.value!.read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      expect(($getSelection() as RangeSelection).anchor.offset).toBe(3);
    });
    editor.dispatchCommand(CLOSE_PAGE_SLOT_COMMAND, undefined);
    expect(headerTexts(host)).toEqual([
      'Hello world',
      'Hello world',
      'Hello world',
    ]);
    editor.read(() => {
      expect(JSON.stringify($getPageHeader())).toContain('Hello world');
      // The document itself is untouched.
      expect($getRoot().getChildren().every($isParagraphNode)).toBe(true);
    });
    // Exactly one parent update: the write-back of the session.
    expect(parentUpdates).toBe(1);
  });

  test('numbers pages in every clone and keeps layout update-free', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE * 2 + 5);
        $setPageSetup(HEADER_SETUP);
        $setPageHeader(slotState(editor, 'Page ', true));
      },
      {discrete: true},
    );
    await expect.poll(() => headerTexts(host).length).toBe(3);
    await nextFrames(4);
    await expect
      .poll(() =>
        headerSlots(host).map(
          slot => `${slot.dataset.pageIndex}:${slot.textContent}`,
        ),
      )
      .toEqual(['0:Page 1', '1:Page 2', '2:Page 3']);

    // The live editor shows the number of the page it is opened on.
    const {activeSlotEditor} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;
    editor.dispatchCommand(EDIT_PAGE_SLOT_COMMAND, {
      kind: 'header',
      pageIndex: 2,
    });
    activeSlotEditor.value!.read(() => {
      expect($getRoot().getTextContent()).toBe('Page 3');
    });
    editor.dispatchCommand(CLOSE_PAGE_SLOT_COMMAND, undefined);

    let updates = 0;
    onTestFinished(editor.registerUpdateListener(() => updates++));
    for (let i = 0; i < 5; i++) {
      editor.update(
        () =>
          $getRoot().append(
            $createParagraphNode().append($createTextNode(`more ${i}`)),
          ),
        {discrete: true},
      );
    }
    await nextFrames(6);
    expect(updates).toBe(5);
  });
});
