/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Reproduction for dictation / autocorrect word replacement.
 *
 * macOS / iOS dictation (and spellcheck "Replace" and autocorrect) revise an
 * already-inserted word by firing a `beforeinput` event with
 *   inputType: 'insertReplacementText'
 * whose `getTargetRanges()` points at the word to replace and whose
 * `dataTransfer` (text/plain) carries the replacement text. `event.data` is
 * typically null for this input type.
 *
 * The expected behavior is that the targeted word is REPLACED with the closest
 * match. The reported bug (#6940) is that the misunderstood word is DELETED and
 * the replacement is never inserted, leaving a gap in the sentence.
 */

import {registerRichText} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $setSelection,
  LexicalEditor,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {
  afterEach,
  assert,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

// Desktop macOS Chrome: dictation/autocorrect replacements arrive as
// `insertReplacementText` beforeinput events with a targetRange + dataTransfer.
vi.mock('lexical/src/environment', () => ({
  CAN_USE_BEFORE_INPUT: true,
  CAN_USE_DOM: true,
  IS_ANDROID: false,
  IS_ANDROID_CHROME: false,
  IS_APPLE: true,
  IS_APPLE_WEBKIT: false,
  IS_CHROME: true,
  IS_FIREFOX: false,
  IS_IOS: false,
  IS_SAFARI: false,
}));

function getDOMTextNode(editor: LexicalEditor, textKey: string): Text {
  const span = editor.getElementByKey(textKey);
  assert(span !== null, 'span is null');
  const textNode = span.firstChild;
  assert(
    textNode !== null && textNode.nodeType === Node.TEXT_NODE,
    'expected DOM text node',
  );
  return textNode as Text;
}

function createStaticRange(
  startContainer: Node,
  startOffset: number,
  endContainer: Node,
  endOffset: number,
): StaticRange {
  return new StaticRange({
    endContainer,
    endOffset,
    startContainer,
    startOffset,
  });
}

/**
 * Build a `beforeinput` InputEvent carrying a targetRange and a text/plain
 * dataTransfer payload — the shape browsers use for insertReplacementText.
 */
function createReplacementEvent(
  replacement: string,
  targetRange: StaticRange | null,
): InputEvent {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', replacement);
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertReplacementText',
  });
  Object.defineProperty(event, 'dataTransfer', {value: dataTransfer});
  Object.defineProperty(event, 'getTargetRanges', {
    value: () => (targetRange ? [targetRange] : []),
  });
  return event;
}

async function setSingleTextNode(
  editor: LexicalEditor,
  text: string,
  cursorOffset: number,
): Promise<string> {
  let textKey = '';
  await editor.update(() => {
    const paragraph = $createParagraphNode();
    const node = $createTextNode(text);
    paragraph.append(node);
    $getRoot().clear().append(paragraph);
    textKey = node.getKey();

    const sel = $createRangeSelection();
    sel.anchor.set(textKey, cursorOffset, 'text');
    sel.focus.set(textKey, cursorOffset, 'text');
    $setSelection(sel);
  });
  return textKey;
}

describe('Dictation / autocorrect insertReplacementText', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditor;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-lexical-editor', 'true');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = createTestEditor();
    registerRichText(editor);
    editor.setRootElement(container);
  });

  afterEach(() => {
    editor.setRootElement(null);
    document.body.removeChild(container);
  });

  test('replaces the targeted word when the caret is collapsed at the end', async () => {
    // "this is a test" — caret collapsed at end (offset 14). The OS revises
    // "test" (offsets 10–14) into "best".
    const text = 'this is a test';
    const textKey = await setSingleTextNode(editor, text, text.length);
    const domText = getDOMTextNode(editor, textKey);

    const targetRange = createStaticRange(domText, 10, domText, 14);
    container.dispatchEvent(createReplacementEvent('best', targetRange));

    await editor.read(() => {
      expect($getRoot().getTextContent()).toBe('this is a best');
    });
  });

  test('replaces a multi-word targetRange that straddles two text nodes', async () => {
    // Dictation revises a run of misheard words ("Internet pron") into the
    // closest match ("incorrect"). The run spans
    // two adjacent text nodes (kept separate via differing style so Lexical
    // does not merge them), and the OS targetRange crosses the boundary.
    let key1 = '';
    let key2 = '';
    await editor.update(() => {
      const paragraph = $createParagraphNode();
      const node1 = $createTextNode('say Internet ').setStyle('--x:0');
      const node2 = $createTextNode('pron word');
      paragraph.append(node1, node2);
      $getRoot().clear().append(paragraph);
      key1 = node1.getKey();
      key2 = node2.getKey();

      const sel = $createRangeSelection();
      // Stale non-collapsed selection over "word" — unrelated to the revision,
      // as can be left behind mid-dictation. The OS targetRange must still win.
      sel.anchor.set(key2, 5, 'text');
      sel.focus.set(key2, 9, 'text');
      $setSelection(sel);
    });

    const domText1 = getDOMTextNode(editor, key1);
    const domText2 = getDOMTextNode(editor, key2);
    // "Internet " starts at offset 4 of node1; "pron" ends at offset 4 of node2.
    const targetRange = createStaticRange(domText1, 4, domText2, 4);
    container.dispatchEvent(createReplacementEvent('incorrect', targetRange));

    await editor.read(() => {
      expect($getRoot().getTextContent()).toBe('say incorrect word');
    });
  });

  test('replaces the targeted word when a stale non-collapsed selection exists', async () => {
    // Same revision, but the Lexical selection is a leftover non-collapsed
    // range (e.g. from a prior composition step) that does NOT match the
    // OS-provided targetRange. The OS targetRange is authoritative and must win.
    const text = 'this is a test';
    const textKey = await setSingleTextNode(editor, text, text.length);
    const domText = getDOMTextNode(editor, textKey);

    await editor.update(() => {
      const sel = $createRangeSelection();
      // Stale selection over "this" (offsets 0–4), unrelated to the revision.
      sel.anchor.set(textKey, 0, 'text');
      sel.focus.set(textKey, 4, 'text');
      $setSelection(sel);
    });

    const targetRange = createStaticRange(domText, 10, domText, 14);
    container.dispatchEvent(createReplacementEvent('best', targetRange));

    await editor.read(() => {
      expect($getRoot().getTextContent()).toBe('this is a best');
    });
  });
});
