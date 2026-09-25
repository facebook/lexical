/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Clicking anywhere else mid-composition — inside the editor or out of it —
 * makes the browser force-commit and fire compositionend. The editor is still
 * the active element at that point, so the activeElement guards in
 * $updateDOMSelection pass and reconciliation used to scroll the caret back
 * into view, undoing the scrolling the user just did to reach what they clicked.
 *
 * These run in a real browser (so the scroll is real) and go through the native
 * compositionend path, which compose()'s default commit deliberately bypasses.
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from 'lexical';
import {expect, onTestFinished, test} from 'vitest';

import {compose, korean} from './utils/compose';

/** Enough paragraphs that the caret at the end sits well below the viewport. */
function createTallEditor(): LexicalEditor {
  const editor = buildEditorFromExtensions({
    $initialEditorState: () => {
      const root = $getRoot();
      for (let i = 0; i < 30; i++) {
        root.append(
          $createParagraphNode().append($createTextNode(`line ${i}`)),
        );
      }
    },
    dependencies: [RichTextExtension],
    name: 'test',
  });
  const rootElement = document.createElement('div');
  rootElement.contentEditable = 'true';
  document.body.appendChild(rootElement);
  editor.setRootElement(rootElement);
  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(rootElement);
    window.scrollTo(0, 0);
  });
  return editor;
}

/** Caret at the end, scrolled out of view. Records Lexical's scrolls from here. */
async function focusEndAndScrollAway(rootElement: HTMLElement) {
  await new Promise(resolve => setTimeout(resolve, 0));
  rootElement.focus();
  const textSpans = rootElement.querySelectorAll('[data-lexical-text]');
  const lastText = textSpans[textSpans.length - 1]?.firstChild;
  expect(lastText).toBeInstanceOf(Text);
  document
    .getSelection()!
    .collapse(lastText!, (lastText as Text).nodeValue!.length);

  const scrolls: string[] = [];
  const originalScrollBy = window.scrollBy.bind(window);
  // scrollBy is overloaded, so the spy is cast rather than structurally typed.
  window.scrollBy = ((...args: unknown[]) => {
    scrolls.push(`scrollBy(${args.join(',')})`);
    return (originalScrollBy as (...a: unknown[]) => void)(...args);
  }) as typeof window.scrollBy;
  onTestFinished(() => {
    window.scrollBy = originalScrollBy;
  });

  window.scrollTo(0, 0);
  await new Promise(resolve => setTimeout(resolve, 50));
  expect(window.scrollY).toBe(0);
  return scrolls;
}

// WebKit defers compositionend to the next keydown, which a click never sends,
// so it does not reach this path and passes trivially today. Left unskipped: if
// that deferral is ever fixed (it drops the commit outright — a separate bug),
// the path opens and this starts holding the line on its own.
test('a browser-forced commit does not scroll the caret back into view', async () => {
  const editor = createTallEditor();
  const rootElement = editor.getRootElement()!;
  const scrolls = await focusEndAndScrollAway(rootElement);

  await compose({editor, rootElement}, {...korean(['ㅁ']), commit: 'forced'});

  expect(scrolls).toEqual([]);
  expect(window.scrollY).toBe(0);
});

// The worse case, since the user never even left: the caret lands on the line
// they clicked but the scroll jumps to where they were composing and stays —
// the selection change that follows does not undo it.
test('a forced commit that moves the caret within the editor does not scroll', async () => {
  const editor = createTallEditor();
  const rootElement = editor.getRootElement()!;
  const scrolls = await focusEndAndScrollAway(rootElement);

  await compose({editor, rootElement}, {...korean(['ㅁ']), commit: 'forced'});

  const visible = rootElement.querySelectorAll('[data-lexical-text]')[2]
    .firstChild as Text;
  document.getSelection()!.collapse(visible, 2);
  document.dispatchEvent(new Event('selectionchange'));
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(scrolls).toEqual([]);
  expect(window.scrollY).toBe(0);
});

test('a typed commit still scrolls the caret back into view', async () => {
  const editor = createTallEditor();
  const rootElement = editor.getRootElement()!;
  const scrolls = await focusEndAndScrollAway(rootElement);

  // Default commit: the keystroke keydowns are what a typed commit looks like.
  await compose({editor, rootElement}, korean(['ㅁ']));

  expect(scrolls.length).toBeGreaterThan(0);
  expect(window.scrollY).toBeGreaterThan(0);
});
