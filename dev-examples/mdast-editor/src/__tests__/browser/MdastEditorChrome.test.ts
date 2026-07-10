/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  MdastCommonMarkExtension,
  MdastExportExtension,
  MdastGfmExtension,
} from '@lexical/mdast';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  defineExtension,
  type LexicalEditor,
} from 'lexical';
import {describe, expect, onTestFinished, test, vi} from 'vitest';

import {$isFootnoteDefinitionNode} from '../../extensions/FootnoteNodes';
import {MdastAlertExtension} from '../../extensions/MdastAlertExtension';
import {MdastCollapsibleExtension} from '../../extensions/MdastCollapsibleExtension';
import {MdastFootnoteExtension} from '../../extensions/MdastFootnoteExtension';

// The in-lexical chrome these extensions render — the collapsible's chevron
// and the alert title's dropdown — is driven by real DOM events and, for the
// dropdown, by DOM inserted OUTSIDE of reconciliation (guarded by
// setDOMUnmanaged against the mutation observer). Those interactions need a
// real mounted editor in a real browser, so they live in the `browser`
// vitest project rather than jsdom.

function mountEditor(markdown: string): {
  editor: LexicalEditor;
  root: HTMLElement;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const contentEditable = document.createElement('div');
  contentEditable.contentEditable = 'true';
  container.appendChild(contentEditable);

  const editor = buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: () => {
        $convertFromMarkdownString(markdown);
      },
      dependencies: [
        MdastCommonMarkExtension,
        MdastGfmExtension,
        MdastExportExtension,
        MdastCollapsibleExtension,
        MdastAlertExtension,
        MdastFootnoteExtension,
        RichTextExtension,
      ],
      name: '[mdast-editor-example-chrome-test]',
    }),
  );
  editor.setRootElement(contentEditable);

  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  return {editor, root: contentEditable};
}

function markdownOf(editor: LexicalEditor): string {
  return editor.read(() => $convertToMarkdownString());
}

describe('collapsible chevron', () => {
  const ENCODING =
    '<details><summary>\nThe *summary*\n</summary>\n\nBody\n</details>';

  test('toggles the open NodeState and the data-open attribute', async () => {
    const {editor, root} = mountEditor(ENCODING);
    const host = root.querySelector<HTMLElement>('.collapsible-container');
    expect(host).not.toBeNull();
    // No `open` attribute in the source: imported closed.
    expect(host!.getAttribute('data-open')).toBeNull();

    const toggle = root.querySelector<HTMLElement>('.collapsible-toggle');
    expect(toggle).not.toBeNull();
    toggle!.click();
    await vi.waitFor(() =>
      expect(host!.getAttribute('data-open')).toBe('true'),
    );
    expect(markdownOf(editor)).toContain('<details open>');

    toggle!.click();
    await vi.waitFor(() => expect(host!.getAttribute('data-open')).toBeNull());
    expect(markdownOf(editor)).toContain('<details>');
  });

  test('reveals the summary slot in the summary row', () => {
    const {root} = mountEditor(ENCODING);
    const slot = root.querySelector<HTMLElement>(
      '.collapsible-summary-row > [data-lexical-slot="summary"]',
    );
    expect(slot).not.toBeNull();
    expect(slot!.textContent).toBe('The summary');
  });
});

describe('alert title dropdown', () => {
  const ALERT = '> [!NOTE]\n> body text';

  function openMenu(root: HTMLElement): HTMLElement {
    const title = root.querySelector<HTMLElement>('.markdown-alert-title');
    expect(title).not.toBeNull();
    title!.click();
    const menu = title!.querySelector<HTMLElement>('.markdown-alert-menu');
    expect(menu).not.toBeNull();
    return menu!;
  }

  test('renders the chrome for an imported alert', () => {
    const {root} = mountEditor(ALERT);
    const quote = root.querySelector<HTMLElement>('.markdown-alert');
    expect(quote).not.toBeNull();
    expect(quote!.classList.contains('markdown-alert-note')).toBe(true);
    expect(
      quote!.querySelector('.markdown-alert-title-label')!.textContent,
    ).toBe('Note');
  });

  test('the menu survives inside the editor DOM (setDOMUnmanaged)', async () => {
    const {editor, root} = mountEditor(ALERT);
    const menu = openMenu(root);
    // The menu is click-time DOM inside the contentEditable; without the
    // unmanaged marking the mutation observer would evict it. Give the
    // observer a chance, including across an unrelated reconciliation.
    await new Promise(resolve => setTimeout(resolve, 50));
    editor.update(() => {});
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(menu.isConnected).toBe(true);
  });

  test('lists the five types in GitHub order plus convert', () => {
    const {root} = mountEditor(ALERT);
    const menu = openMenu(root);
    const items = Array.from(
      menu.querySelectorAll('.markdown-alert-menu-item'),
    ).map(item => item.textContent);
    expect(items).toEqual([
      'Note',
      'Tip',
      'Important',
      'Warning',
      'Caution',
      'Convert to blockquote',
    ]);
    expect(
      menu.querySelector('.markdown-alert-menu-item.is-current')!.textContent,
    ).toBe('Note');
  });

  test('selecting a type updates the chrome and the Markdown', async () => {
    const {editor, root} = mountEditor(ALERT);
    const menu = openMenu(root);
    const tip = Array.from(
      menu.querySelectorAll<HTMLElement>('.markdown-alert-menu-item'),
    ).find(item => item.textContent === 'Tip');
    tip!.click();
    await vi.waitFor(() => {
      expect(root.querySelector('.markdown-alert-tip')).not.toBeNull();
      expect(
        root.querySelector('.markdown-alert-title-label')!.textContent,
      ).toBe('Tip');
    });
    expect(root.querySelector('.markdown-alert-menu')).toBeNull();
    expect(markdownOf(editor)).toBe('> [!TIP]\n> body text');
  });

  test('an outside pointerdown dismisses without changes', () => {
    const {editor, root} = mountEditor(ALERT);
    openMenu(root);
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', {bubbles: true}),
    );
    expect(root.querySelector('.markdown-alert-menu')).toBeNull();
    expect(markdownOf(editor)).toBe(ALERT);
  });

  test('Escape dismisses without changes', () => {
    const {editor, root} = mountEditor(ALERT);
    openMenu(root);
    document.dispatchEvent(
      new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}),
    );
    expect(root.querySelector('.markdown-alert-menu')).toBeNull();
    expect(markdownOf(editor)).toBe(ALERT);
  });

  test('convert to blockquote strips the chrome and the marker', async () => {
    const {editor, root} = mountEditor(ALERT);
    const menu = openMenu(root);
    const convert = Array.from(
      menu.querySelectorAll<HTMLElement>('.markdown-alert-menu-item'),
    ).find(item => item.textContent === 'Convert to blockquote');
    convert!.click();
    await vi.waitFor(() => {
      expect(root.querySelector('.markdown-alert')).toBeNull();
      expect(root.querySelector('.markdown-alert-title')).toBeNull();
    });
    expect(markdownOf(editor)).toBe('> body text');
  });
});

describe('footnotes', () => {
  test('footnotes render at the document bottom from the root slot', () => {
    const {editor, root} = mountEditor(
      'body[^a] text\n\n[^a]: the note\n\ntrailing paragraph',
    );
    // The ref is inline chrome in the body.
    const ref = root.querySelector<HTMLElement>('.footnote-ref');
    expect(ref).not.toBeNull();
    expect(ref!.textContent).toBe('a');
    // The section renders inside the bottom anchor — the root's LAST
    // element — even though the source put the definition mid-document.
    const last = root.lastElementChild!;
    expect(last.classList.contains('footnotes-anchor')).toBe(true);
    expect(last.querySelector('.footnote-def-label')!.textContent).toBe('a');
    // And the definitions are appended to the serialized Markdown's end.
    expect(markdownOf(editor)).toBe(
      'body[^a] text\n\ntrailing paragraph\n\n[^a]: the note',
    );
  });

  test('removing the last definition drops the section and its refs', async () => {
    const {editor, root} = mountEditor(
      'body[^a] and[^a] again\n\n[^a]: the note',
    );
    root.querySelector<HTMLElement>('.footnote-def-remove')!.click();
    await vi.waitFor(() => {
      expect(root.querySelector('.footnotes')).toBeNull();
      // The deletion cascades: every reference to the label goes too.
      expect(root.querySelector('.footnote-ref')).toBeNull();
    });
    expect(markdownOf(editor)).toBe('body and again');
  });

  test('clicking a ref moves the caret into the definition body', async () => {
    const {editor, root} = mountEditor('body[^a]\n\n[^a]: the note');
    root.querySelector<HTMLElement>('.footnote-ref')!.click();
    await vi.waitFor(() => {
      const inDefinition = editor.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        const anchorNode = selection.anchor.getNode();
        return (
          $isFootnoteDefinitionNode(anchorNode) ||
          anchorNode.getParents().some($isFootnoteDefinitionNode)
        );
      });
      expect(inDefinition).toBe(true);
    });
  });

  test('a real copy event carries the selected refs definitions in the HTML', () => {
    const {editor, root} = mountEditor(
      'one[^a] and[^b] more\n\n[^a]: note a\n\n[^b]: note b',
    );
    // A DOM selection left over from another test would sit outside this
    // editor, and the copy handler correctly refuses to serialize in that
    // state — clear it so only the lexical selection below matters.
    window.getSelection()!.removeAllRanges();
    editor.update(
      () => {
        const paragraph = $getRoot().getFirstChild();
        const texts = (
          $isElementNode(paragraph) ? paragraph.getChildren() : []
        ).filter($isTextNode);
        // 'one' through ' and': covers [^a], not [^b].
        const selection = $createRangeSelection();
        selection.anchor.set(texts[0].getKey(), 0, 'text');
        selection.focus.set(texts[1].getKey(), 4, 'text');
        $setSelection(selection);
      },
      {discrete: true},
    );
    const event = new ClipboardEvent('copy', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    root.dispatchEvent(event);
    // Read the results back through the EVENT's DataTransfer: Chromium
    // keeps the object passed to the constructor, but Firefox clones it,
    // so the DataTransfer the handler wrote into is only reachable here.
    const html = event.clipboardData!.getData('text/html');
    expect(html).toContain('data-footnote-ref="a"');
    expect(html).toContain('data-footnote-def="a"');
    expect(html).toContain('note a');
    expect(html).not.toContain('note b');
  });

  test('one backlink per reference after the note text, each jumping to its ref', async () => {
    const {editor, root} = mountEditor(
      'first[^a] one\n\nsecond[^a] two\n\n[^a]: note',
    );
    // Two references -> two backlinks (`↩` and `↩²`), rendered inside the
    // note body's last paragraph, GitHub-style.
    await vi.waitFor(() => {
      expect(root.querySelectorAll('.footnote-def-backlink').length).toBe(2);
    });
    const container = root.querySelector<HTMLElement>(
      '.footnote-def-backlinks',
    )!;
    expect(container.parentElement!.tagName).toBe('P');
    expect(container.closest('.footnote-def-content')).not.toBeNull();
    const backlinks = Array.from(
      container.querySelectorAll<HTMLElement>('.footnote-def-backlink'),
    );
    expect(backlinks[1].querySelector('sup')!.textContent).toBe('2');
    const $anchorBlockText = () =>
      editor.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return '';
        }
        const top = selection.anchor.getNode().getTopLevelElement();
        return top === null ? '' : top.getTextContent();
      });
    backlinks[0].click();
    await vi.waitFor(() => expect($anchorBlockText()).toContain('first'));
    backlinks[1].click();
    await vi.waitFor(() => expect($anchorBlockText()).toContain('second'));
  });
});
