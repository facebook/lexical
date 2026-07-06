/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  COMPOSITION_END_TAG,
  COMPOSITION_START_TAG,
  LexicalEditor,
} from 'lexical';
import {describe, expect, onTestFinished, test} from 'vitest';

import {compose, korean} from './utils/compose';

const IS_FIREFOX =
  typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent);

function createEditor(initialState?: () => void): LexicalEditor {
  const editor = buildEditorFromExtensions({
    $initialEditorState:
      initialState ??
      (() => {
        $getRoot().append($createParagraphNode());
      }),
    dependencies: [RichTextExtension],
    name: 'test',
  });
  const root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
  editor.setRootElement(root);
  onTestFinished(() => {
    editor.setRootElement(null);
    document.body.removeChild(root);
  });
  return editor;
}

async function waitForRender(): Promise<void> {
  await new Promise(r => setTimeout(r, 0));
}

async function focusAtEnd(rootElement: HTMLElement): Promise<void> {
  await waitForRender();
  rootElement.focus();
  const textSpan = rootElement.querySelector('[data-lexical-text]');
  if (textSpan?.firstChild instanceof Text) {
    const sel = document.getSelection()!;
    sel.collapse(textSpan.firstChild, textSpan.firstChild.nodeValue!.length);
  }
}

async function focusAtStart(rootElement: HTMLElement): Promise<void> {
  await waitForRender();
  rootElement.focus();
  const p = rootElement.querySelector('p');
  if (p) {
    const sel = document.getSelection()!;
    sel.collapse(p, 0);
  }
}

describe('compose() helper — browser composition tests', () => {
  test('Korean jamo composition produces correct text', async () => {
    const editor = createEditor();
    const rootElement = editor.getRootElement()!;
    await focusAtStart(rootElement);

    await compose({rootElement}, korean(['ㅎ', '하', '한']));

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('한');
  });

  test('Korean two-syllable composition', async () => {
    const editor = createEditor();
    const rootElement = editor.getRootElement()!;
    await focusAtStart(rootElement);

    await compose({rootElement}, korean(['ㅎ', '하', '한']));
    await compose({rootElement}, korean(['ㄱ', '그', '글']));

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('한글');
  });

  test('composition into existing text', async () => {
    const editor = createEditor(() => {
      const p = $createParagraphNode();
      p.append($createTextNode('hello '));
      $getRoot().append(p);
    });
    const rootElement = editor.getRootElement()!;
    await focusAtEnd(rootElement);

    await compose({rootElement}, korean(['ㅅ', '세', '셰', '셰ㄱ', '세계']));

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('hello 세계');
  });

  test('cancelled composition reverts text', async () => {
    const editor = createEditor(() => {
      const p = $createParagraphNode();
      p.append($createTextNode('abc'));
      $getRoot().append(p);
    });
    const rootElement = editor.getRootElement()!;
    await focusAtEnd(rootElement);

    await compose(
      {rootElement},
      {
        cancel: true,
        steps: [{text: 'ㅎ'}, {text: '하'}],
      },
    );

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('abc');
  });

  test('composition on bold-formatted text', async () => {
    const editor = createEditor(() => {
      const p = $createParagraphNode();
      const bold = $createTextNode('bold').toggleFormat('bold');
      p.append(bold);
      $getRoot().append(p);
      bold.selectEnd();
    });
    const rootElement = editor.getRootElement()!;
    await focusAtEnd(rootElement);

    await compose({rootElement}, korean(['ㅎ', '하', '한']));

    editor.read(() => {
      const text = $getRoot().getTextContent();
      expect(text).toBe('bold한');
    });
  });

  test('composition replaces selected text', async () => {
    const editor = createEditor(() => {
      const p = $createParagraphNode();
      const node = $createTextNode('hello');
      p.append(node);
      $getRoot().append(p);
      node.select(0, 5);
    });
    const rootElement = editor.getRootElement()!;
    await waitForRender();
    // Place a real DOM selection over the text so compose() picks it up.
    const textSpan = rootElement.querySelector('[data-lexical-text]');
    if (textSpan?.firstChild instanceof Text) {
      document
        .getSelection()!
        .setBaseAndExtent(textSpan.firstChild, 0, textSpan.firstChild, 5);
    }

    await compose({rootElement}, korean(['ㅎ', '하', '한']));

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('한');
  });

  test('three consecutive compositions', async () => {
    const editor = createEditor();
    const rootElement = editor.getRootElement()!;
    await focusAtStart(rootElement);

    await compose({rootElement}, korean(['ㅎ', '하', '한']));
    await compose({rootElement}, korean(['ㄱ', '그', '글']));
    await compose({rootElement}, korean(['ㅇ', '이', '임']));

    const text = editor.read(() => $getRoot().getTextContent());
    expect(text).toBe('한글임');
  });
});

describe('Composition state tracking', () => {
  test('editor.isComposing() is true during composition, false after', async () => {
    const editor = createEditor();
    const rootElement = editor.getRootElement()!;
    await focusAtStart(rootElement);

    expect(editor.isComposing()).toBe(false);

    // Start composition manually to check mid-composition state.
    rootElement.dispatchEvent(
      new CompositionEvent('compositionstart', {bubbles: true, data: ''}),
    );
    await waitForRender();
    expect(editor.isComposing()).toBe(true);

    // End it via a full compose sequence on a fresh editor to verify
    // the flag clears.
    rootElement.dispatchEvent(
      new CompositionEvent('compositionend', {bubbles: true, data: ''}),
    );
    await waitForRender();

    if (IS_FIREFOX) {
      // Firefox defers compositionend processing until the next input event.
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        data: '',
        inputType: 'insertCompositionText',
      });
      Object.defineProperty(inputEvent, 'isComposing', {value: false});
      rootElement.dispatchEvent(inputEvent);
      await waitForRender();
    }

    expect(editor.isComposing()).toBe(false);
  });

  test('COMPOSITION_START_TAG and COMPOSITION_END_TAG appear in updates', async () => {
    const editor = createEditor();
    const rootElement = editor.getRootElement()!;
    await focusAtStart(rootElement);

    const observedTags: string[][] = [];
    editor.registerUpdateListener(({tags}) => {
      if (tags.size > 0) {
        observedTags.push(Array.from(tags));
      }
    });

    await compose({rootElement}, korean(['ㅎ', '하', '한']));

    expect(
      observedTags.some(tags => tags.includes(COMPOSITION_START_TAG)),
    ).toBe(true);
    expect(observedTags.some(tags => tags.includes(COMPOSITION_END_TAG))).toBe(
      true,
    );
  });
});

describe('Firefox deferred compositionend', () => {
  test.skipIf(!IS_FIREFOX)(
    'COMPOSITION_END_TAG is emitted via deferred onInput path',
    async () => {
      const editor = createEditor(() => {
        const p = $createParagraphNode();
        p.append($createTextNode('-'));
        $getRoot().append(p);
      });
      const rootElement = editor.getRootElement()!;
      await focusAtEnd(rootElement);

      const observedTags: string[][] = [];
      editor.registerUpdateListener(({tags}) => {
        observedTags.push(Array.from(tags));
      });

      await compose({rootElement}, korean(['ㅎ', '하', '한']));

      expect(
        observedTags.some(tags => tags.includes(COMPOSITION_END_TAG)),
      ).toBe(true);
    },
  );
});
