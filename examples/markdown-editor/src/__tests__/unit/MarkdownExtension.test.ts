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
} from '@lexical/extension';
import {
  $createListItemNode,
  $createListNode,
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
  defineExtension,
  type LexicalEditorWithDispose,
  TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {
  $convertListItemPrefixToCheckList,
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

describe('$convertListItemPrefixToCheckList', () => {
  function withBulletListItem(
    text: string,
    fn: (editor: LexicalEditorWithDispose) => void,
  ): void {
    using editor = createTestEditor();
    editor.update(
      () => {
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        item.append($createTextNode(text));
        list.append(item);
        $getRoot().clear().append(list);
      },
      {discrete: true},
    );
    fn(editor);
  }

  test('a bullet list item authored with `[ ] ` is auto-converted', () => {
    withBulletListItem('[ ] todo', editor => {
      expect(exportMarkdown(editor)).toBe('- [ ] todo');
    });
  });

  test('a bullet list item authored with `[x] ` is auto-converted', () => {
    withBulletListItem('[x] done', editor => {
      expect(exportMarkdown(editor)).toBe('- [x] done');
    });
  });

  test('a bullet list item without a marker is left alone', () => {
    withBulletListItem('plain text', editor => {
      expect(exportMarkdown(editor)).toBe('- plain text');
    });
  });

  test('the function is a no-op when called on an already-stripped item', () => {
    using editor = createTestEditor();
    let itemKey = '';
    editor.update(
      () => {
        const list = $createListNode('check');
        const item = $createListItemNode(false);
        item.append($createTextNode('already done'));
        list.append(item);
        $getRoot().clear().append(list);
        itemKey = item.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const item = editor
          .getEditorState()
          ._nodeMap.get(itemKey) as ListItemNode;
        const result = $convertListItemPrefixToCheckList(item);
        expect(result).toBe(false);
      },
      {discrete: true},
    );
  });

  test('mutating a list item text into `[x] foo` triggers the transform', () => {
    using editor = createTestEditor();
    let textKey = '';
    editor.update(
      () => {
        const list = $createListNode('bullet');
        const item = $createListItemNode();
        const text = $createTextNode('placeholder');
        item.append(text);
        list.append(item);
        $getRoot().clear().append(list);
        textKey = text.getKey();
      },
      {discrete: true},
    );
    editor.update(
      () => {
        const text = editor.getEditorState()._nodeMap.get(textKey) as TextNode;
        text.setTextContent('[x] foo');
      },
      {discrete: true},
    );
    expect(exportMarkdown(editor)).toBe('- [x] foo');
  });
});

describe('MarkdownExtension markdown signal', () => {
  test('updates as the editor state changes', () => {
    using editor = createTestEditor();
    const {markdown} = getExtensionDependencyFromEditor(
      editor,
      MarkdownExtension,
    ).output;
    // The signal is lazy: it only stays in sync while it has a
    // subscriber. A no-op subscription gets us into the watched state.
    const dispose = markdown.subscribe(() => {});
    try {
      expect(markdown.value).toBe('');
      importMarkdown(editor, '# Title');
      expect(markdown.value).toBe('# Title');
      importMarkdown(editor, '- one\n- two');
      expect(markdown.value).toBe('- one\n- two');
    } finally {
      dispose();
    }
  });
});
