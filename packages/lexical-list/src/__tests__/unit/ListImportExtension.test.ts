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
import {DOMImportExtension} from '@lexical/html';
import {
  $isListItemNode,
  $isListNode,
  ListImportExtension,
  ListItemNode,
  ListNode,
} from '@lexical/list';
import {JSDOM} from 'jsdom';
import {
  $getRoot,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [ListImportExtension],
      name: 'list-host',
      nodes: [ListNode, ListItemNode],
    }),
  );
}

function $generate(editor: LexicalEditor, html: string): LexicalNode[] {
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document);
}

function $importInto(editor: LexicalEditor, html: string): void {
  editor.update(
    () => {
      const nodes = $generate(editor, html);
      $getRoot()
        .clear()
        .append(...nodes);
    },
    {discrete: true},
  );
}

function $rootList(): ListNode {
  const node = $getRoot().getFirstChild();
  assert($isListNode(node), 'expected ListNode at root');
  return node;
}

function $items(list: ListNode): ListItemNode[] {
  return list.getChildren().filter($isListItemNode);
}

describe('ListImportExtension', () => {
  test('<ul><li>a</li><li>b</li></ul> → bullet list with two items', () => {
    using editor = buildEditor();
    $importInto(editor, '<ul><li>a</li><li>b</li></ul>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('bullet');
      const items = $items(list);
      expect(items).toHaveLength(2);
      expect(items[0].getTextContent()).toBe('a');
      expect(items[1].getTextContent()).toBe('b');
    });
  });

  test('<ol start="3"> → number list with start=3', () => {
    using editor = buildEditor();
    $importInto(editor, '<ol start="3"><li>x</li></ol>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('number');
      expect(list.getStart()).toBe(3);
    });
  });

  test('GitHub task-list-item → checklist item', () => {
    using editor = buildEditor();
    $importInto(
      editor,
      '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked/>done</li><li class="task-list-item"><input type="checkbox"/>todo</li></ul>',
    );
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('check');
      const items = $items(list);
      expect(items).toHaveLength(2);
      expect(items[0].getChecked()).toBe(true);
      expect(items[1].getChecked()).toBe(false);
    });
  });

  test('aria-checked drives checklist state', () => {
    using editor = buildEditor();
    $importInto(editor, '<ul><li aria-checked="true">a</li></ul>');
    editor.read(() => {
      const list = $rootList();
      expect(list.getListType()).toBe('check');
      const items = $items(list);
      expect(items[0].getChecked()).toBe(true);
    });
  });

  test('stray text inside <ul> gets wrapped via $normalizeListChildren', () => {
    using editor = buildEditor();
    $importInto(editor, '<ul>stray <li>real item</li></ul>');
    editor.read(() => {
      const list = $rootList();
      const items = $items(list);
      // The framework's flattening of unmatched <ul> child text + the legacy
      // normalize step both produce list items; the real item must survive.
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.some(i => i.getTextContent().includes('real item'))).toBe(
        true,
      );
    });
  });
});
