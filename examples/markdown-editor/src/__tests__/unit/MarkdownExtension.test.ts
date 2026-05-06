/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  effect,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import {
  $getEditor,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  type LexicalEditorWithDispose,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {MarkdownExtension} from '../../extensions/MarkdownExtension';

function createTestEditor(
  $initialEditorState?: () => void,
): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState,
      dependencies: [MarkdownExtension],
      name: 'markdown-editor-test',
      namespace: 'markdown-editor-test',
    }),
  );
}

function $importMarkdown(markdown: string): void {
  getExtensionDependencyFromEditor(
    $getEditor(),
    MarkdownExtension,
  ).output.$fromString(markdown);
}

function importMarkdown(
  editor: LexicalEditorWithDispose,
  markdown: string,
): void {
  editor.update(() => $importMarkdown(markdown), {discrete: true});
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor.read(
    getExtensionDependencyFromEditor(editor, MarkdownExtension).output
      .$toString,
  );
}

describe('MARKDOWN_TRANSFORMERS', () => {
  test('round-trips a heading', () => {
    using editor = createTestEditor(() => $importMarkdown('# Hello'));
    expect(exportMarkdown(editor)).toBe('# Hello');
  });

  test('round-trips inline formats', () => {
    using editor = createTestEditor(() =>
      $importMarkdown('A **bold** and *italic* and `code` line'),
    );
    expect(exportMarkdown(editor)).toBe(
      'A **bold** and *italic* and `code` line',
    );
  });

  test('round-trips an unordered list', () => {
    const md = '- one\n- two\n- three';
    using editor = createTestEditor(() => $importMarkdown(md));
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('round-trips an ordered list', () => {
    const md = '1. one\n2. two\n3. three';
    using editor = createTestEditor(() => $importMarkdown(md));
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('round-trips a check list', () => {
    const md = '- [ ] todo\n- [x] done';
    using editor = createTestEditor(() => $importMarkdown(md));
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('CHECK_LIST is matched before UNORDERED_LIST on import', () => {
    using editor = createTestEditor(() => $importMarkdown('- [x] done'));
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      assert($isListNode(list), 'Expecting ListNode');
      expect(list.getListType()).toBe('check');
      const item = list.getFirstChild();
      assert($isListItemNode(item), 'Expecting ListItemNode');
      expect(item.getChecked()).toBe(true);
      expect(item.getTextContent()).toBe('done');
    });
  });
});

describe('CHECK_LIST_ITEM typing-time transformer', () => {
  function $setupBulletListItem(): void {
    $getRoot()
      .clear()
      .append($createListNode('bullet').append($createListItemNode()))
      .selectEnd();
  }

  function typeChars(editor: LexicalEditorWithDispose, chars: string): void {
    for (const ch of chars) {
      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expecting RangeSelection');
          selection.insertText(ch);
        },
        {discrete: true},
      );
    }
  }

  test('typing `[x] ` inside a bullet list item flips it to a checklist', () => {
    using editor = createTestEditor($setupBulletListItem);
    typeChars(editor, '[x] ');
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      assert($isListNode(list), 'Expecting ListNode');
      expect(list.getListType()).toBe('check');
      const item = list.getFirstChild();
      assert($isListItemNode(item), 'Expecting ListItemNode');
      expect(item.getChecked()).toBe(true);
      expect(item.getTextContent()).toBe('');
    });
  });

  test('typing `[ ] ` inside a bullet list item flips it to an unchecked item', () => {
    using editor = createTestEditor($setupBulletListItem);
    typeChars(editor, '[ ] ');
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      assert($isListNode(list), 'Expecting ListNode');
      expect(list.getListType()).toBe('check');
      const item = list.getFirstChild();
      assert($isListItemNode(item), 'Expecting ListItemNode');
      expect(item.getChecked()).toBe(false);
    });
  });

  test('typing nothing matching is left alone', () => {
    using editor = createTestEditor($setupBulletListItem);
    typeChars(editor, 'plain ');
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      assert($isListNode(list), 'Expecting ListNode');
      expect(list.getListType()).toBe('bullet');
    });
  });
});

describe('MarkdownExtension markdown signal', () => {
  test('updates as the editor state changes', () => {
    using editor = createTestEditor();
    const {markdown} = getExtensionDependencyFromEditor(
      editor,
      MarkdownExtension,
    ).output;
    // Capture the latest value into a local so the effect both keeps
    // the lazy signal watched and gives the assertions something to
    // read directly. `using` disposes the effect on test exit.
    let current = '';
    using _watch = effect(() => {
      current = markdown.value;
    });
    expect(current).toBe('');
    importMarkdown(editor, '# Title');
    expect(current).toBe('# Title');
    importMarkdown(editor, '- one\n- two');
    expect(current).toBe('- one\n- two');
  });
});
