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
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

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

describe('LinkImportExtension', () => {
  test('<a href="…">text</a> → LinkNode with TextNode child', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p><a href="https://example.com">click</a></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const link = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getFirstChild();
      expect($isLinkNode(link)).toBe(true);
      // We read href via getAttribute so JSDOM's URL resolution is bypassed.
      expect((link as LinkNode).getURL()).toBe('https://example.com');
      expect((link as LinkNode).getTextContent()).toBe('click');
    });
  });

  test('rel, target, title preserved', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p><a href="/x" target="_blank" rel="noopener" title="hello">x</a></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const link = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getFirstChild() as LinkNode;
      expect(link.getTarget()).toBe('_blank');
      expect(link.getRel()).toBe('noopener');
      expect(link.getTitle()).toBe('hello');
    });
  });

  test('empty <a> with no children is skipped', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<p>before<a href="/x"></a>after</p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const para = $getRoot().getFirstChild() as ParagraphNode;
      expect(para.getTextContent()).toBe('beforeafter');
    });
  });
});
