/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  type AnyLexicalExtension,
  buildEditorFromExtensions,
} from '@lexical/extension';
import {HistoryExtension} from '@lexical/history';
import {PlainTextExtension} from '@lexical/plain-text';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  configExtension,
  CUT_COMMAND,
  CUT_TAG,
  type LexicalEditorWithDispose,
  PASTE_COMMAND,
  PASTE_TAG,
  UNDO_COMMAND,
} from 'lexical';
import {describe, expect, test, vi} from 'vitest';

type UpdatePayload = {tags: Set<string>};

// Use a constant clock so that every change falls inside the merge window
// (delay). Without the fix, a clipboard operation the heuristic treats as
// mergeable (an in-place single-character insert) would collapse into the
// surrounding run of typing; @lexical/history now classifies PASTE_TAG/CUT_TAG
// updates as their own undo boundary instead (see #8609).
function createEditor(
  textExtension?: AnyLexicalExtension,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions({
    $initialEditorState: () => {
      const paragraph = $createParagraphNode();
      $getRoot().append(paragraph);
      paragraph.selectEnd();
    },
    dependencies: [
      ...(textExtension ? [textExtension] : []),
      configExtension(HistoryExtension, {delay: 1000, now: () => 0}),
    ],
    name: 'test',
  });
}

function $type(text: string): void {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    selection.insertText(text);
  }
}

function clipboardEvent(type: 'cut' | 'paste', text: string): ClipboardEvent {
  const clipboardData = new DataTransfer();
  clipboardData.setData('text/plain', text);
  return new ClipboardEvent(type, {clipboardData});
}

// The reconcile (and therefore update listeners) run after a microtask, and the
// rich-text cut handler awaits copyToClipboard before removing the text, so
// flush the timer queue before asserting on captured updates.
function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Recognition lives in @lexical/history: any update tagged PASTE_TAG or CUT_TAG
// is classified as `OTHER`, which both keeps it from merging into the preceding
// keystrokes and (by becoming `prevChangeType`) keeps the following keystrokes
// from merging into it. These drive editor.update directly with the tag so they
// exercise the history logic independent of the clipboard handlers.
describe.each([
  ['PASTE_TAG', PASTE_TAG],
  ['CUT_TAG', CUT_TAG],
])('@lexical/history treats %s as an undo boundary (#8609)', (_label, tag) => {
  test('a tagged single-character change is isolated between keystrokes', () => {
    using editor = createEditor();

    // Type three characters that merge into a single history entry.
    editor.update(() => $type('a'), {discrete: true});
    editor.update(() => $type('b'), {discrete: true});
    editor.update(() => $type('c'), {discrete: true});

    // An in-place single-character insert would normally merge into the run of
    // typing; the tag forces it into its own entry.
    editor.update(() => $type('X'), {discrete: true, tag});

    // Following keystrokes do not merge into the tagged entry either.
    editor.update(() => $type('d'), {discrete: true});

    // Undo removes only the trailing keystroke...
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(editor.read(() => $getRoot().getTextContent())).toBe('abcX');

    // ...then the tagged change, leaving the earlier typing intact.
    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(editor.read(() => $getRoot().getTextContent())).toBe('abc');
  });
});

// Each handler tags its clipboard update so the recognition above engages. A
// vi.fn() records each update separately so we assert that a single update
// carried the tag, rather than conflating tags across updates.
describe.each([
  ['rich text', RichTextExtension],
  ['plain text', PlainTextExtension],
])(
  '%s clipboard handlers tag their updates (#8609)',
  (_name, textExtension) => {
    test('paste tags the update with PASTE_TAG', async () => {
      using editor = createEditor(textExtension);
      const updateListener = vi.fn<(payload: UpdatePayload) => void>();
      const unregister = editor.registerUpdateListener(updateListener);

      editor.dispatchCommand(PASTE_COMMAND, clipboardEvent('paste', 'X'));
      await flush();
      unregister();

      const pasteTagged = updateListener.mock.calls.some(([{tags}]) =>
        tags.has(PASTE_TAG),
      );
      expect(pasteTagged).toBe(true);
    });

    test('cut tags the update with CUT_TAG', async () => {
      using editor = createEditor(textExtension);
      const updateListener = vi.fn<(payload: UpdatePayload) => void>();
      const unregister = editor.registerUpdateListener(updateListener);

      editor.update(() => $type('abc'), {discrete: true});
      editor.update(
        () => {
          $getRoot().getAllTextNodes()[0].select(1, 3);
        },
        {discrete: true},
      );

      editor.dispatchCommand(CUT_COMMAND, clipboardEvent('cut', ''));
      await flush();
      unregister();

      const cutTagged = updateListener.mock.calls.some(([{tags}]) =>
        tags.has(CUT_TAG),
      );
      expect(cutTagged).toBe(true);
    });
  },
);

// End-to-end coverage of the user-facing bug from #8609: undoing a paste should
// not also undo the typing before it. This is only *observable* for a short
// rich-text paste, which inserts in place (RangeSelection.insertText) and would
// otherwise merge into the preceding keystrokes; cut and plain-text paste
// produce an `OTHER` change the heuristic already isolates. Removing the
// PASTE_TAG recognition in @lexical/history makes this test fail.
describe('rich-text paste is isolated from the preceding typing (#8609)', () => {
  test('a single undo after a paste keeps the text typed before it', () => {
    using editor = createEditor(RichTextExtension);

    editor.update(() => $type('a'), {discrete: true});
    editor.update(() => $type('b'), {discrete: true});
    editor.update(() => $type('c'), {discrete: true});

    editor.dispatchCommand(PASTE_COMMAND, clipboardEvent('paste', 'X'));
    expect(editor.read(() => $getRoot().getTextContent())).toBe('abcX');

    editor.dispatchCommand(UNDO_COMMAND, undefined);
    expect(editor.read(() => $getRoot().getTextContent())).toBe('abc');
  });
});
