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
import {CoreImportExtension, DOMImportExtension} from '@lexical/html';
import {JSDOM} from 'jsdom';
import {
  $getRoot,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type TextNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [CoreImportExtension],
      name: 'core-host',
    }),
  );
}

function $generate(editor: LexicalEditor, html: string): LexicalNode[] {
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document);
}

describe('CoreImportExtension', () => {
  test('paragraph + text', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<p>Hello world</p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const para = $getRoot().getFirstChild() as ParagraphNode;
      expect(para.getTextContent()).toBe('Hello world');
    });
  });

  test('inline format tags propagate via ImportTextFormat', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p>a <strong>b <em>c</em></strong> <code>d</code></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const texts = ($getRoot().getFirstChild() as ParagraphNode).getChildren();
      const find = (s: string) =>
        texts.find(t => (t as TextNode).getTextContent() === s) as TextNode;
      expect(find('a ').getFormat()).toBe(0);
      expect(find('b ').hasFormat('bold')).toBe(true);
      expect(find('b ').hasFormat('italic')).toBe(false);
      expect(find('c').hasFormat('bold')).toBe(true);
      expect(find('c').hasFormat('italic')).toBe(true);
      expect(find('d').hasFormat('code')).toBe(true);
    });
  });

  test('span with Google-Docs-style CSS pushes formats into context', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<p><span style="font-weight:700">bold</span> <span style="font-style:italic">italic</span> <span style="text-decoration:underline line-through">both</span></p>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const texts = ($getRoot().getFirstChild() as ParagraphNode).getChildren();
      const find = (s: string) =>
        texts.find(t => (t as TextNode).getTextContent() === s) as TextNode;
      expect(find('bold').hasFormat('bold')).toBe(true);
      expect(find('italic').hasFormat('italic')).toBe(true);
      expect(find('both').hasFormat('underline')).toBe(true);
      expect(find('both').hasFormat('strikethrough')).toBe(true);
    });
  });

  test('<b style="font-weight:normal"> (Google Docs wrapper) does NOT add bold', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(
          editor,
          '<b style="font-weight:normal"><p>plain</p></b>',
        );
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const text = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getFirstChild() as TextNode;
      expect(text.getTextContent()).toBe('plain');
      expect(text.hasFormat('bold')).toBe(false);
    });
  });

  test('<pre> preserves whitespace, splits on \\n into LineBreakNode', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<pre>line1\nline2</pre>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      // <pre> isn't matched by any specific rule so the framework hoists its
      // children. Result: text "line1", linebreak, text "line2" wrapped by
      // RootSchema into a paragraph.
      const para = $getRoot().getFirstChild() as ParagraphNode;
      const children = para.getChildren();
      expect(children.length).toBe(3);
      expect((children[0] as TextNode).getTextContent()).toBe('line1');
      expect(children[1].getType()).toBe('linebreak');
      expect((children[2] as TextNode).getTextContent()).toBe('line2');
    });
  });

  test('whitespace collapsing matches legacy behavior', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<p>  hello   world  </p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const text = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getTextContent();
      expect(text).toBe('hello world');
    });
  });

  test('<br> creates a LineBreakNode', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<p>a<br>b</p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const children = (
        $getRoot().getFirstChild() as ParagraphNode
      ).getChildren();
      expect(children.length).toBe(3);
      expect(children[1].getType()).toBe('linebreak');
    });
  });

  test('paragraph align attribute fallback', () => {
    using editor = buildEditor();
    editor.update(
      () => {
        const nodes = $generate(editor, '<p align="center">center</p>');
        $getRoot()
          .clear()
          .append(...nodes);
      },
      {discrete: true},
    );
    editor.read(() => {
      const p = $getRoot().getFirstChild() as ParagraphNode;
      expect(p.getFormatType()).toBe('center');
    });
  });
});
