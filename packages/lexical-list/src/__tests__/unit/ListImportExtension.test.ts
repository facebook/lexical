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
import {describe, expect, test} from 'vitest';

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

describe('ListImportExtension', () => {
  test('<ul><li>a</li><li>b</li></ul> → bullet list with two items', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<ul><li>a</li><li>b</li></ul>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect($isListNode(list)).toBe(true);
      expect(list.getListType()).toBe('bullet');
      const items = list.getChildren();
      expect(items.length).toBe(2);
      expect((items[0] as ListItemNode).getTextContent()).toBe('a');
      expect((items[1] as ListItemNode).getTextContent()).toBe('b');
    });
  });

  test('<ol start="3"> → number list with start=3', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<ol start="3"><li>x</li></ol>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect($isListNode(list)).toBe(true);
      expect(list.getListType()).toBe('number');
      expect(list.getStart()).toBe(3);
    });
  });

  test('GitHub task-list-item → checklist item', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked/>done</li><li class="task-list-item"><input type="checkbox"/>todo</li></ul>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect(list.getListType()).toBe('check');
      const items = list.getChildren() as ListItemNode[];
      expect(items[0].getChecked()).toBe(true);
      expect(items[1].getChecked()).toBe(false);
    });
  });

  test('aria-checked drives checklist state', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<ul><li aria-checked="true">a</li></ul>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      expect(list.getListType()).toBe('check');
      const item = list.getFirstChild() as ListItemNode;
      expect(item.getChecked()).toBe(true);
    });
  });

  test('stray text inside <ul> gets wrapped via normalizeListChildren', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<ul>stray <li>real item</li></ul>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const list = $getRoot().getFirstChild() as ListNode;
      const items = list.getChildren() as ListItemNode[];
      // Stray text gets wrapped in its own ListItemNode (the normalize
      // step works on flattened children).
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect($isListItemNode(items[items.length - 1])).toBe(true);
    });
  });
});
