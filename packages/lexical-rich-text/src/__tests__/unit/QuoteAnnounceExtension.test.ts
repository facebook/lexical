/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {AriaLiveRegionExtension} from '@lexical/a11y';
import {
  buildEditorFromExtensions,
  defineExtension,
  getExtensionDependencyFromEditor,
  type LexicalEditorWithDispose,
} from '@lexical/extension';
import {PlainTextExtension} from '@lexical/plain-text';
import {
  $createQuoteNode,
  QuoteAnnounceExtension,
  RichTextExtension,
} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  configExtension,
} from 'lexical';
import {afterEach, describe, expect, onTestFinished, test} from 'vitest';

afterEach(() => {
  document.body.replaceChildren();
});

function mountRoot(editor: LexicalEditorWithDispose): void {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => root.remove());
}

function readLiveRegion(): string {
  // A repeat announcement gets a trailing zero-width space so the DOM registers
  // a change; strip it so assertions read naturally.
  return (
    document.body.querySelector('[aria-live]')!.textContent ?? ''
  ).replace(/\u200B/g, '');
}

function clearLiveRegion(): void {
  const region = document.body.querySelector('[aria-live]');
  if (region) {
    region.textContent = '';
  }
}

function buildEditor(): LexicalEditorWithDispose {
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [RichTextExtension],
      name: '[root]',
    }),
  );
  mountRoot(editor);
  return editor;
}

/** Append a quote holding one line of text, and put the caret inside it. */
function addQuote(editor: LexicalEditorWithDispose, text = 'quoted'): void {
  editor.update(
    () => {
      const quote = $createQuoteNode();
      const paragraphText = $createTextNode(text);
      quote.append(paragraphText);
      $getRoot().append(quote);
      paragraphText.selectEnd();
    },
    {discrete: true},
  );
}

describe('QuoteAnnounceExtension', () => {
  test('announces a block becoming a quote', () => {
    using editor = buildEditor();
    addQuote(editor);

    expect(readLiveRegion()).toBe('Block quote');
  });

  test('announces a quote being removed', () => {
    using editor = buildEditor();
    addQuote(editor);
    clearLiveRegion();

    editor.update(() => void $getRoot().getLastChild()?.remove(), {
      discrete: true,
    });

    expect(readLiveRegion()).toBe('Block quote removed');
  });

  test('stays silent while typing inside a quote', () => {
    using editor = buildEditor();
    addQuote(editor);
    clearLiveRegion();

    editor.update(
      () => {
        const quote = $getRoot().getLastChild();
        if (quote !== null && 'append' in quote) {
          (quote as ReturnType<typeof $createQuoteNode>).append(
            $createTextNode(' more'),
          );
        }
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('');
  });

  test('announces leaving when the block after the quote is new', () => {
    using editor = buildEditor();
    addQuote(editor);
    clearLiveRegion();

    // What pressing Enter at the end of a quote does: the paragraph the caret
    // lands in is made by the same update that moves the caret.
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Exiting block quote');
  });

  test('stays silent when the caret only moves across the edge', () => {
    using editor = buildEditor();
    addQuote(editor);
    editor.update(() => void $getRoot().append($createParagraphNode()), {
      discrete: true,
    });
    clearLiveRegion();

    // What the arrow keys do: both blocks are already there, so the screen
    // reader reports the boundary itself.
    editor.update(() => void $getRoot().getLastChild()?.selectEnd(), {
      discrete: true,
    });
    expect(readLiveRegion()).toBe('');

    editor.update(() => void $getRoot().getFirstChild()?.selectEnd(), {
      discrete: true,
    });
    expect(readLiveRegion()).toBe('');
  });

  test('announces entering when the block the caret came from goes away', () => {
    using editor = buildEditor();
    addQuote(editor);
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().append(paragraph);
        paragraph.selectEnd();
      },
      {discrete: true},
    );
    clearLiveRegion();

    // What backspacing at the start of that paragraph does.
    editor.update(
      () => {
        const root = $getRoot();
        root.getLastChild()?.remove();
        root.getLastChild()?.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Block quote');
  });

  test('says both the removal and where the caret landed', () => {
    using editor = buildEditor();
    addQuote(editor, 'first');
    addQuote(editor, 'second');
    clearLiveRegion();

    // Backspacing out of the lower of two quotes. A quote went away, and the
    // caret is now inside the one above — the user needs to be told both.
    editor.update(
      () => {
        const root = $getRoot();
        root.getLastChild()?.remove();
        root.getLastChild()?.selectEnd();
      },
      {discrete: true},
    );

    expect(readLiveRegion()).toBe('Block quote removed, in block quote');
  });

  test('honours a configured message', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [
          RichTextExtension,
          configExtension(QuoteAnnounceExtension, {
            created: 'Quote',
          }),
        ],
        name: '[root]',
      }),
    );
    mountRoot(editor);

    addQuote(editor);
    expect(readLiveRegion()).toBe('Quote');
  });

  test('says nothing when disabled', () => {
    using editor = buildEditor();
    const {disabled} = getExtensionDependencyFromEditor(
      editor,
      QuoteAnnounceExtension,
    ).output;

    disabled.value = true;
    addQuote(editor);
    expect(readLiveRegion()).toBe('');

    disabled.value = false;
    addQuote(editor, 'second');
    expect(readLiveRegion()).toBe('Block quote');
  });

  test('leaves a plain text editor alone', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [AriaLiveRegionExtension, PlainTextExtension],
        name: '[root]',
      }),
    );
    mountRoot(editor);

    editor.update(() => void $getRoot().append($createParagraphNode()), {
      discrete: true,
    });

    expect(readLiveRegion()).toBe('');
  });
});
