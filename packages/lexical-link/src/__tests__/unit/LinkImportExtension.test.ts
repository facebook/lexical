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
import {$isLinkNode, LinkImportExtension, LinkNode} from '@lexical/link';
import {JSDOM} from 'jsdom';
import {
  $getRoot,
  $isParagraphNode,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [LinkImportExtension],
      name: 'link-host',
      nodes: [LinkNode],
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

function $firstLink(): LinkNode {
  const para = $getRoot().getFirstChild();
  assert($isParagraphNode(para), 'expected paragraph');
  const link = para.getFirstChild();
  assert($isLinkNode(link), 'expected LinkNode');
  return link;
}

describe('LinkImportExtension', () => {
  test('<a href="…">text</a> → LinkNode with TextNode child', () => {
    using editor = buildEditor();
    $importInto(editor, '<p><a href="https://example.com">click</a></p>');
    editor.read(() => {
      const link = $firstLink();
      // href is read via getAttribute, so JSDOM's URL resolution is bypassed.
      expect(link.getURL()).toBe('https://example.com');
      expect(link.getTextContent()).toBe('click');
    });
  });

  test('rel, target, title preserved', () => {
    using editor = buildEditor();
    $importInto(
      editor,
      '<p><a href="/x" target="_blank" rel="noopener" title="hello">x</a></p>',
    );
    editor.read(() => {
      const link = $firstLink();
      expect(link.getTarget()).toBe('_blank');
      expect(link.getRel()).toBe('noopener');
      expect(link.getTitle()).toBe('hello');
    });
  });

  test('empty <a> with no children is skipped', () => {
    using editor = buildEditor();
    $importInto(editor, '<p>before<a href="/x"></a>after</p>');
    editor.read(() => {
      const para = $getRoot().getFirstChild();
      assert($isParagraphNode(para), 'expected paragraph');
      expect(para.getTextContent()).toBe('beforeafter');
    });
  });
});
