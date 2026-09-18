/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $handlePlainTextDrop,
  $handleRichTextDrop,
  $writeDragSourceToDataTransfer,
  ClipboardImportExtension,
  type ImportMimeTypeFunction,
} from '@lexical/clipboard';
import {
  buildEditorFromExtensions,
  configExtension,
  defineExtension,
} from '@lexical/extension';
import {createEmptyHistoryState, registerHistory} from '@lexical/history';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  type LexicalEditor,
  type RangeSelection,
  UNDO_COMMAND,
} from 'lexical';
import {assert, expect, onTestFinished, test, vi} from 'vitest';

function mount(
  text: string,
  importer?: ImportMimeTypeFunction,
  onError?: (error: Error) => void,
) {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.style.cssText =
    'font: 20px monospace; white-space: pre-wrap; padding: 10px;';
  document.body.append(root);
  const editor = buildEditorFromExtensions(
    defineExtension({
      dependencies: [
        RichTextExtension,
        configExtension(ClipboardImportExtension, {
          $importMimeType: {'text/plain': importer ? [importer] : []},
        }),
      ],
      name: 'test/drop-target',
      onError,
    }),
  );
  editor.setRootElement(root);
  const history = createEmptyHistoryState();
  const unregister = registerHistory(editor, history, 0, () => 0);
  onTestFinished(() => {
    unregister();
    editor.dispose();
    root.remove();
  });
  let key = '';
  editor.update(
    () => {
      const node = $createTextNode(text);
      key = node.getKey();
      $getRoot().clear().append($createParagraphNode().append(node));
    },
    {discrete: true},
  );
  return {editor, history, key, root};
}

function select(editor: LexicalEditor, start: number, end: number) {
  editor.update(
    () => {
      const node = $getRoot().getFirstChildOrThrow();
      assert($isElementNode(node));
      const text = node.getFirstChildOrThrow();
      assert($isTextNode(text));
      text.select(start, end);
    },
    {discrete: true},
  );
}

function drop(
  source: LexicalEditor,
  dest: LexicalEditor,
  key: string,
  offset: number,
  prepare?: (selection: RangeSelection) => undefined,
  rich = false,
) {
  const dataTransfer = new DataTransfer();
  source.update(
    () => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      dataTransfer.setData('text/plain', selection.getTextContent());
      $writeDragSourceToDataTransfer(dataTransfer, source);
    },
    {discrete: true},
  );
  const dom = dest.getElementByKey(key)?.firstChild;
  assert(dom);
  const range = document.createRange();
  range.setStart(dom, offset);
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  const event = new DragEvent('drop', {
    cancelable: true,
    clientX: rect.x,
    clientY: rect.y + rect.height / 2,
    dataTransfer,
  });
  dest.update(
    () => {
      expect(
        rich
          ? $handleRichTextDrop(event, dest)
          : $handlePlainTextDrop(
              event,
              dest,
              prepare
                ? caret => ({
                    $beforeInsert: prepare,
                    caret,
                  })
                : undefined,
            ),
      ).toBe(true);
    },
    {discrete: true},
  );
  expect(event.defaultPrevented).toBe(true);
}

function expectContent(editor: LexicalEditor, text: string, offset?: number) {
  editor.read(() => {
    expect($getRoot().getTextContent()).toBe(text);
    if (offset !== undefined) {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.offset).toBe(offset);
    }
  });
}

test.each([
  ['abcFOOdefXYZ', 3, 6, 9, 'abcdefFOOXYZ', 9],
  ['abcdefFOOxyz', 6, 9, 3, 'abcFOOdefxyz', 6],
] as const)(
  'hit-tests an interior drop in %s and undoes the move once',
  (text, start, end, target, expected, caret) => {
    const {editor, key} = mount(text);
    select(editor, start, end);
    drop(editor, editor, key, target);
    expectContent(editor, expected, caret);
    editor.dispatchCommand(UNDO_COMMAND);
    expectContent(editor, text);
  },
);

test.each([
  ['start', false],
  ['start', true],
  ['end', false],
  ['end', true],
] as const)(
  'hit-tests an excluded %s endpoint (backward=%s)',
  (edge, backward) => {
    const {editor} = mount('');
    const atStart = edge === 'start';
    let targetKey = '';
    editor.update(
      () => {
        const left = $createTextNode('abc').toggleUnmergeable();
        const source = $createTextNode('FOO').toggleUnmergeable();
        const right = $createTextNode('def').toggleUnmergeable();
        $getRoot()
          .clear()
          .append($createParagraphNode().append(left, source, right));
        const selection = $createRangeSelection();
        const start = backward ? selection.focus : selection.anchor;
        const end = backward ? selection.anchor : selection.focus;
        start.set(
          atStart ? left.getKey() : source.getKey(),
          atStart ? 3 : 0,
          'text',
        );
        end.set(
          atStart ? source.getKey() : right.getKey(),
          atStart ? 3 : 0,
          'text',
        );
        $setSelection(selection);
        targetKey = (atStart ? left : right).getKey();
      },
      {discrete: true},
    );
    drop(editor, editor, targetKey, 1);
    expectContent(editor, atStart ? 'aFOObcdef' : 'abcdFOOef', 3);
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const inserted = $getRoot()
        .getAllTextNodes()
        .find(node => node.getTextContent() === 'FOO');
      assert(inserted);
      expect(selection.anchor.key).toBe(inserted.getKey());
      expect(selection.anchor.type).toBe('text');
    });
    editor.dispatchCommand(UNDO_COMMAND);
    expectContent(editor, 'abcFOOdef');
  },
);

test.each([0, 3])(
  'hit-tests an inclusive text endpoint at %s without moving source',
  offset => {
    for (const rich of [false, true]) {
      const importer = vi.fn<ImportMimeTypeFunction>(() => false);
      const prepare = vi.fn((selection: RangeSelection) => {
        selection.insertNodes([$createLineBreakNode()]);
        return undefined;
      });
      const {editor, history, key} = mount('FOO', importer);
      select(editor, 0, 3);
      const range = editor.read(() => $getSelection()?.clone());
      const before = editor.getEditorState().toJSON();
      const undoCount = history.undoStack.length;
      drop(editor, editor, key, offset, prepare, rich);
      expect(prepare).not.toHaveBeenCalled();
      expect(importer).not.toHaveBeenCalled();
      expect(editor.getEditorState().toJSON()).toEqual(before);
      editor.read(() => {
        expect(
          $getRoot()
            .getAllTextNodes()
            .map(node => node.getKey()),
        ).toEqual([key]);
        expect($getSelection()?.is(range ?? null)).toBe(true);
      });
      expect(history.undoStack).toHaveLength(undoCount);
    }
  },
);

test.each(
  [false, true].flatMap(rich =>
    [false, true].flatMap(backward =>
      [false, true].map(beforeSource => ({backward, beforeSource, rich})),
    ),
  ),
)(
  'moves multiline source within an endpoint block (rich=$rich, backward=$backward, before=$beforeSource)',
  ({rich, backward, beforeSource}) => {
    const {editor, history} = mount('');
    let targetKey = '';
    editor.update(
      () => {
        const first = $createTextNode('abcFOO');
        const last = $createTextNode(beforeSource ? 'BARdef' : 'BARdefXYZ');
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(first),
            $createParagraphNode().append(last),
          );
        const selection = $createRangeSelection();
        const start = backward ? selection.focus : selection.anchor;
        const end = backward ? selection.anchor : selection.focus;
        start.set(first.getKey(), 3, 'text');
        end.set(last.getKey(), 3, 'text');
        $setSelection(selection);
        targetKey = (beforeSource ? first : last).getKey();
      },
      {discrete: true},
    );
    const before = editor.getEditorState().toJSON();
    const source = editor.read(() => $getSelection()?.clone());
    const keys = editor.read(() =>
      $getRoot()
        .getAllTextNodes()
        .map(node => node.getKey()),
    );
    editor.read(() =>
      expect($getSelection()?.getTextContent()).toBe('FOO\nBAR'),
    );
    const undoCount = history.undoStack.length;
    drop(editor, editor, targetKey, beforeSource ? 1 : 6, undefined, rich);
    expectContent(
      editor,
      beforeSource
        ? rich
          ? 'aFOO\n\nBARbcdef'
          : 'aFOO\nBARbcdef'
        : rich
          ? 'abcdefFOO\n\nBARXYZ'
          : 'abcdefFOO\nBARXYZ',
      3,
    );
    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const insertedEnd = $getRoot()
        .getAllTextNodes()
        .find(
          node =>
            node.getTextContent() === (beforeSource ? 'BARbcdef' : 'BARXYZ'),
        );
      assert(insertedEnd && insertedEnd.isAttached());
      expect(selection.anchor.key).toBe(insertedEnd.getKey());
      expect(selection.anchor.type).toBe('text');
      expect(selection.focus.is(selection.anchor)).toBe(true);
    });
    expect(history.undoStack).toHaveLength(undoCount + 1);
    editor.dispatchCommand(UNDO_COMMAND);
    editor.read(() => {
      expect(editor.getEditorState().toJSON()).toEqual(before);
      expect($getSelection()?.is(source ?? null)).toBe(true);
      expect(
        $getRoot()
          .getAllTextNodes()
          .map(node => node.getKey()),
      ).toEqual(keys);
    });
    expect(history.undoStack).toHaveLength(undoCount);
  },
);

test('cross-editor preparation deletes source once with independent undo', () => {
  const source = mount('source-content');
  const dest = mount('target');
  select(source.editor, 0, 6);
  let deletions = 0;
  source.root.addEventListener('beforeinput', event => {
    if ((event as InputEvent).inputType === 'deleteByDrag') {
      deletions++;
    }
  });
  drop(source.editor, dest.editor, dest.key, 3, selection => {
    selection.insertNodes([$createLineBreakNode()]);
  });
  expectContent(source.editor, '-content', 0);
  expectContent(dest.editor, 'tar\nsourceget', 6);
  expect(deletions).toBe(1);
  dest.editor.dispatchCommand(UNDO_COMMAND);
  expectContent(dest.editor, 'target');
  expectContent(source.editor, '-content');
  source.editor.dispatchCommand(UNDO_COMMAND);
  expectContent(source.editor, 'source-content');
  expectContent(dest.editor, 'target');
});

test('a rich importer inserts the payload with formatting', () => {
  const source = mount('source-content');
  const dest = mount('target', (data, selection) => {
    assert($isRangeSelection(selection));
    selection.toggleFormat('bold');
    selection.insertText(data);
    return true;
  });
  select(source.editor, 0, 6);
  drop(source.editor, dest.editor, dest.key, 3, undefined, true);
  expectContent(source.editor, '-content');
  expectContent(dest.editor, 'tarsourceget', 6);
  dest.editor.read(() => {
    const selection = $getSelection();
    assert($isRangeSelection(selection));
    const node = selection.anchor.getNode();
    assert($isTextNode(node));
    expect(node.getTextContent()).toBe('source');
    expect(node.hasFormat('bold')).toBe(true);
  });
});

test.each(['preparation', 'insertion', 'rich import'])(
  '%s failure never dispatches cross-editor deletion',
  mode => {
    const source = mount('source-content');
    const onError = vi.fn();
    const dest = mount(
      'target',
      mode === 'rich import'
        ? () => {
            throw new Error('import failed');
          }
        : undefined,
      onError,
    );
    select(source.editor, 0, 6);
    const deletion = vi.fn();
    source.root.addEventListener('beforeinput', deletion);
    drop(
      source.editor,
      dest.editor,
      dest.key,
      3,
      selection => {
        if (mode === 'preparation') {
          throw new Error('preparation failed');
        }
        vi.spyOn(selection, 'insertRawText').mockImplementation(() => {
          throw new Error('insertion failed');
        });
      },
      mode === 'rich import',
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(deletion).not.toHaveBeenCalled();
    expectContent(source.editor, 'source-content');
    expectContent(dest.editor, 'target');
  },
);
