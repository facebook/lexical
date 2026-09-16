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
  $isParagraphNode,
  defineExtension,
  HISTORY_MERGE_TAG,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

import {$createPageBreakNode} from '../../nodes/PageBreakNode';
import {
  $setPageSetup,
  computeGeometry,
  pageContentTop,
  type PageSetup,
  PagesExtension,
} from '../../plugins/PagesExtension';

const LINE_HEIGHT = 20;
const PAGE_SETUP: PageSetup = {
  margins: {bottom: 0.4, left: 0.4, right: 0.4, top: 0.4},
  orientation: 'portrait',
  pageSize: 'Statement',
};
const GEOM = computeGeometry(PAGE_SETUP, 0, 0, 24);
const LINES_PER_PAGE = Math.floor(GEOM.contentHeight / LINE_HEIGHT);

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim ' +
  'veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea ' +
  'commodo consequat. ';

function nextFrames(count: number): Promise<void> {
  return new Promise(resolve => {
    const step = (n: number) =>
      n === 0 ? resolve() : requestAnimationFrame(() => step(n - 1));
    step(count);
  });
}

function mount(options: {viewportWidth?: number} = {}) {
  const style = document.createElement('style');
  style.textContent = `
    .ContentEditable__root { font: 16px/${LINE_HEIGHT}px monospace; position: relative; outline: 0; }
    .ContentEditable__root p { margin: 0; }
  `;
  const viewport = document.createElement('div');
  viewport.style.width = `${options.viewportWidth ?? 800}px`;
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
      name: 'PagesLayout.test',
    }),
  );
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.dispose();
    viewport.remove();
    style.remove();
  });
  return {editor, host, root, viewport};
}

function $fillLines(count: number) {
  const root = $getRoot();
  root.clear();
  for (let i = 0; i < count; i++) {
    root.append($createParagraphNode().append($createTextNode(`line ${i}`)));
  }
}

function breaks(host: HTMLElement) {
  return Array.from(host.querySelectorAll<HTMLElement>('.Pages__break'));
}

async function settled(host: HTMLElement) {
  // Layout writes happen in rAF; wait for two idle frames and assert the
  // layer no longer changes.
  await nextFrames(4);
  const observed: MutationRecord[] = [];
  const observer = new MutationObserver(records => observed.push(...records));
  const layer = host.querySelector('.Pages__layer');
  if (layer) {
    observer.observe(layer, {attributes: true, childList: true, subtree: true});
  }
  await nextFrames(3);
  observer.disconnect();
  return observed.length;
}

describe('PagesLayout', () => {
  test('renders one page for a short document and grows with content', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(3);
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect
      .poll(() => host.querySelector('.Pages__layer') !== null)
      .toBe(true);
    await expect.poll(() => breaks(host).length).toBe(0);
    await expect
      .poll(() => host.style.getPropertyValue('--page-count'))
      .toBe('1');

    editor.update(() => $fillLines(LINES_PER_PAGE * 2 + 5), {discrete: true});
    await expect.poll(() => breaks(host).length).toBe(2);
    await expect
      .poll(() => host.style.getPropertyValue('--page-count'))
      .toBe('3');
    const {pageCount} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;
    expect(pageCount.value).toBe(3);
    expect(await settled(host)).toBe(0);

    editor.update(() => $fillLines(2), {discrete: true});
    await expect.poll(() => breaks(host).length).toBe(0);
  });

  test('positions breaks exactly one content height apart', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE * 3);
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect.poll(() => breaks(host).length).toBe(2);
    await settled(host);
    const hostTop = host.getBoundingClientRect().top;
    breaks(host).forEach((brk, i) => {
      const top = brk.getBoundingClientRect().top - hostTop;
      expect(
        Math.abs(top - (pageContentTop(i, GEOM) + GEOM.contentHeight)),
      ).toBeLessThan(1);
    });
  });

  test('lays out without dispatching editor updates', async () => {
    const {editor, host} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE - 2);
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect.poll(() => host.querySelector('.Pages__layer')).not.toBeNull();
    await settled(host);

    let updates = 0;
    const tags: string[] = [];
    onTestFinished(
      editor.registerUpdateListener(payload => {
        updates++;
        tags.push(...payload.tags);
      }),
    );
    for (let i = 0; i < 10; i++) {
      editor.update(
        () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode(`more ${i}`)),
          );
        },
        {discrete: true},
      );
    }
    await expect.poll(() => breaks(host).length).toBe(1);
    await settled(host);
    expect(updates).toBe(10);
    expect(tags).not.toContain(HISTORY_MERGE_TAG);
  });

  test('flows the lines of a straddling paragraph around the break', async () => {
    const {editor, host, root} = mount();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode(LOREM.repeat(12))),
          );
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect.poll(() => breaks(host).length).toBeGreaterThanOrEqual(1);
    await settled(host);
    const paragraph = root.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const lines = Array.from(range.getClientRects());
    expect(lines.length).toBeGreaterThan(LINES_PER_PAGE);
    const bands = breaks(host).map(b => b.getBoundingClientRect());
    const straddling = lines.filter(line =>
      bands.some(
        band => line.bottom > band.top + 1 && line.top < band.bottom - 1,
      ),
    );
    expect(straddling).toEqual([]);
  });

  test('pushes content after a manual page break to the next page', async () => {
    const {editor, host, root} = mount();
    editor.update(
      () => {
        const r = $getRoot();
        r.clear();
        r.append(
          $createParagraphNode().append($createTextNode('before')),
          $createPageBreakNode(),
          $createParagraphNode().append($createTextNode('after')),
        );
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect.poll(() => breaks(host).length).toBe(1);
    await settled(host);
    const after = root.querySelectorAll('p')[1];
    const top = root.offsetTop + after.offsetTop;
    expect(Math.abs(top - pageContentTop(1, GEOM))).toBeLessThan(1);

    editor.update(
      () => {
        const nodes = $getRoot().getChildren();
        nodes[1].remove();
      },
      {discrete: true},
    );
    await expect.poll(() => breaks(host).length).toBe(0);
    await settled(host);
    expect(root.querySelector('hr')).toBeNull();
    expect(root.offsetTop + after.offsetTop).toBeLessThan(
      pageContentTop(0, GEOM) + 3 * LINE_HEIGHT,
    );
  });

  test('re-flows on page setup changes and detaches when pageless or disabled', async () => {
    const {editor, host, root} = mount();
    editor.update(
      () => {
        $fillLines(LINES_PER_PAGE + 5);
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect.poll(() => breaks(host).length).toBe(1);

    // A4 is taller than Statement: everything fits on one page.
    editor.update(() => $setPageSetup({...PAGE_SETUP, pageSize: 'A4'}), {
      discrete: true,
    });
    await expect.poll(() => breaks(host).length).toBe(0);
    expect(host.style.getPropertyValue('--page-height')).toBe('1123px');

    const childCount = root.children.length;
    editor.update(() => $setPageSetup(null), {discrete: true});
    await expect.poll(() => host.querySelector('.Pages__layer')).toBeNull();
    expect(host.classList.contains('Pages__host')).toBe(false);
    expect(host.style.getPropertyValue('--page-width')).toBe('');
    expect(root.children.length).toBe(childCount);

    editor.update(() => $setPageSetup(PAGE_SETUP), {discrete: true});
    await expect.poll(() => host.querySelector('.Pages__layer')).not.toBeNull();
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      PagesExtension,
    ).output;
    disabled.value = true;
    await expect.poll(() => host.querySelector('.Pages__layer')).toBeNull();
    editor.read(() => {
      expect($getRoot().getChildren().every($isParagraphNode)).toBe(true);
    });
    disabled.value = false;
    await expect.poll(() => host.querySelector('.Pages__layer')).not.toBeNull();
  });

  test('zooms the host to fit a narrow viewport', async () => {
    const {editor, host, viewport} = mount({viewportWidth: 300});
    editor.update(
      () => {
        $fillLines(3);
        $setPageSetup(PAGE_SETUP);
      },
      {discrete: true},
    );
    await expect
      .poll(() => parseFloat(host.style.getPropertyValue('--page-zoom')))
      .toBeLessThan(0.6);
    viewport.style.width = '900px';
    await expect
      .poll(() => host.style.getPropertyValue('--page-zoom'))
      .toBe('1');
  });
});
