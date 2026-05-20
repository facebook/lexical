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
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
  RichTextImportExtension,
} from '@lexical/rich-text';
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
      dependencies: [RichTextImportExtension],
      name: 'rich-text-host',
      nodes: [HeadingNode, QuoteNode],
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

describe('RichTextImportExtension', () => {
  test.each([
    ['<h1>x</h1>', 'h1'],
    ['<h2>x</h2>', 'h2'],
    ['<h3>x</h3>', 'h3'],
    ['<h4>x</h4>', 'h4'],
    ['<h5>x</h5>', 'h5'],
    ['<h6>x</h6>', 'h6'],
  ])('%s imports as heading %s', (html, tag) => {
    using editor = buildEditor();
    $importInto(editor, html);
    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isHeadingNode(node), 'expected HeadingNode');
      expect(node.getTag()).toBe(tag);
    });
  });

  test('blockquote imports as quote', () => {
    using editor = buildEditor();
    $importInto(editor, '<blockquote>quoted</blockquote>');
    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isQuoteNode(node), 'expected QuoteNode');
      expect(node.getTextContent()).toBe('quoted');
    });
  });

  test('Google Docs title (26pt span) promoted to h1', () => {
    using editor = buildEditor();
    $importInto(editor, '<p><span style="font-size:26pt">Title</span></p>');
    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isHeadingNode(node), 'expected HeadingNode');
      expect(node.getTag()).toBe('h1');
      expect(node.getTextContent()).toBe('Title');
    });
  });
});
