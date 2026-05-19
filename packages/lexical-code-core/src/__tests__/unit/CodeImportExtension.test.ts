/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {CodeExtension, CodeImportExtension} from '@lexical/code-core';
import {
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {DOMImportExtension} from '@lexical/html';
import {JSDOM} from 'jsdom';
import {
  $getRoot,
  $isParagraphNode,
  defineExtension,
  type LexicalEditor,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {$isCodeNode, CodeNode} from '../../CodeNode';

function buildEditor() {
  return buildEditorFromExtensions(
    defineExtension({
      dependencies: [CodeExtension, CodeImportExtension],
      name: 'code-host',
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
      $getRoot().clear().splice(0, 0, nodes);
    },
    {discrete: true},
  );
}

function $rootCode(): CodeNode {
  const node = $getRoot().getFirstChild();
  assert($isCodeNode(node), 'expected CodeNode at root');
  return node;
}

describe('CodeImportExtension', () => {
  test('<pre> imports as CodeNode', () => {
    using editor = buildEditor();
    $importInto(editor, '<pre>const x = 1;</pre>');
    editor.read(() => {
      const node = $rootCode();
      expect(node.getTextContent()).toContain('const x = 1;');
    });
  });

  test('<pre data-language="ts"> sets the language', () => {
    using editor = buildEditor();
    $importInto(editor, '<pre data-language="ts">x</pre>');
    editor.read(() => {
      const node = $rootCode();
      expect(node.getLanguage()).toBe('ts');
    });
  });

  test('multi-line <code> imports as CodeNode (not inline)', () => {
    using editor = buildEditor();
    $importInto(editor, '<code>line1\nline2</code>');
    editor.read(() => {
      const node = $rootCode();
      expect(node.getTextContent()).toContain('line1');
      expect(node.getTextContent()).toContain('line2');
    });
  });

  test('single-line <code> defers to inline-format (no CodeNode)', () => {
    using editor = buildEditor();
    $importInto(editor, '<p><code>inline</code></p>');
    editor.read(() => {
      const para = $getRoot().getFirstChild();
      assert($isParagraphNode(para), 'expected paragraph');
      const text = para.getAllTextNodes()[0];
      assert(text !== undefined, 'expected text node');
      expect(text.getTextContent()).toBe('inline');
      expect(text.hasFormat('code')).toBe(true);
    });
  });

  test('<div style="font-family: monospace"> imports as CodeNode', () => {
    using editor = buildEditor();
    $importInto(
      editor,
      '<div style="font-family: Menlo, monospace">a\nb</div>',
    );
    editor.read(() => {
      const node = $rootCode();
      expect(node.getTextContent()).toContain('a');
      expect(node.getTextContent()).toContain('b');
    });
  });

  test('GitHub raw-file-view table imports as CodeNode', () => {
    using editor = buildEditor();
    $importInto(
      editor,
      [
        '<table class="js-file-line-container">',
        '<tr><td class="js-file-line">line 1</td></tr>',
        '<tr><td class="js-file-line">line 2</td></tr>',
        '</table>',
      ].join(''),
    );
    editor.read(() => {
      const node = $rootCode();
      const text = node.getTextContent();
      expect(text).toContain('line 1');
      expect(text).toContain('line 2');
    });
  });

  test('plain <table> falls through (no CodeNode)', () => {
    using editor = buildEditor();
    $importInto(editor, '<table><tr><td>a</td></tr></table>');
    editor.read(() => {
      const root = $getRoot();
      assert(
        !$isCodeNode(root.getFirstChild()),
        'plain table should not become a CodeNode',
      );
    });
  });
});
