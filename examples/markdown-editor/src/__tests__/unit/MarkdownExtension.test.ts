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
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
} from '@lexical/markdown';
import {
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  defineExtension,
  type LexicalEditorWithDispose,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  MARKDOWN_TRANSFORMERS,
  MarkdownExtension,
} from '../../extensions/MarkdownExtension';

function createTestEditor(): LexicalEditorWithDispose {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [MarkdownExtension],
      name: 'markdown-editor-test',
      namespace: 'markdown-editor-test',
    }),
  );
}

function importMarkdown(
  editor: LexicalEditorWithDispose,
  markdown: string,
): void {
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, MARKDOWN_TRANSFORMERS);
    },
    {discrete: true},
  );
}

function exportMarkdown(editor: LexicalEditorWithDispose): string {
  return editor.read(() => $convertToMarkdownString(MARKDOWN_TRANSFORMERS));
}

describe('MARKDOWN_TRANSFORMERS', () => {
  test('round-trips a heading', () => {
    using editor = createTestEditor();
    importMarkdown(editor, '# Hello');
    expect(exportMarkdown(editor)).toBe('# Hello');
  });

  test('round-trips inline formats', () => {
    using editor = createTestEditor();
    importMarkdown(editor, 'A **bold** and *italic* and `code` line');
    expect(exportMarkdown(editor)).toBe(
      'A **bold** and *italic* and `code` line',
    );
  });

  test('round-trips an unordered list', () => {
    using editor = createTestEditor();
    const md = '- one\n- two\n- three';
    importMarkdown(editor, md);
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('round-trips an ordered list', () => {
    using editor = createTestEditor();
    const md = '1. one\n2. two\n3. three';
    importMarkdown(editor, md);
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('round-trips a check list', () => {
    using editor = createTestEditor();
    const md = '- [ ] todo\n- [x] done';
    importMarkdown(editor, md);
    expect(exportMarkdown(editor)).toBe(md);
  });

  test('CHECK_LIST is matched before UNORDERED_LIST on import', () => {
    using editor = createTestEditor();
    importMarkdown(editor, '- [x] done');
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      expect((list as ListNode).getListType()).toBe('check');
      const item = (list as ListNode).getFirstChild() as ListItemNode;
      expect(item.getChecked()).toBe(true);
      expect(item.getTextContent()).toBe('done');
    });
  });
});

describe('CHECK_LIST_ITEM typing-time transformer', () => {
  function setupBulletListItem(editor: LexicalEditorWithDispose): void {
    editor.update(
      () => {
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        const text = $createTextNode('');
        item.append(text);
        list.append(item);
        $getRoot().clear().append(list);
        text.select(0, 0);
      },
      {discrete: true},
    );
  }

  function typeChars(editor: LexicalEditorWithDispose, chars: string): void {
    for (const ch of chars) {
      editor.update(
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertText(ch);
          }
        },
        {discrete: true},
      );
    }
  }

  test('typing `[x] ` inside a bullet list item flips it to a checklist', () => {
    using editor = createTestEditor();
    setupBulletListItem(editor);
    typeChars(editor, '[x] ');
    editor.read(() => {
      const list = $getRoot().getFirstChild();
      expect($isListNode(list)).toBe(true);
      const listNode = list as ListNode;
      expect(listNode.getListType()).toBe('check');
      const item = listNode.getFirstChild();
      expect($isListItemNode(item)).toBe(true);
      expect((item as ListItemNode).getChecked()).toBe(true);
      expect((item as ListItemNode).getTextContent()).toBe('');
    });
  });

  test('typing `[ ] ` inside a bullet list item flips it to an unchecked item', () => {
    using editor = createTestEditor();
    setupBulletListItem(editor);
    typeChars(editor, '[ ] ');
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect(list.getListType()).toBe('check');
      const item = list.getFirstChild() as ListItemNode;
      expect(item.getChecked()).toBe(false);
    });
  });

  test('typing nothing matching is left alone', () => {
    using editor = createTestEditor();
    setupBulletListItem(editor);
    typeChars(editor, 'plain ');
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
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
