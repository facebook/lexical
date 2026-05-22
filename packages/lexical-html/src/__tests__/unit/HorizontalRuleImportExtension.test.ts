/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isHorizontalRuleNode,
  buildEditorFromExtensions,
  getExtensionDependencyFromEditor,
} from '@lexical/extension';
import {DOMImportExtension, HorizontalRuleImportExtension} from '@lexical/html';
import {JSDOM} from 'jsdom';
import {
  $getEditor,
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
      dependencies: [HorizontalRuleImportExtension],
      name: 'hr-host',
    }),
  );
}

function $generate(html: string): LexicalNode[] {
  const editor = $getEditor();
  const dep = getExtensionDependencyFromEditor(editor, DOMImportExtension);
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`);
  return dep.output.$generateNodesFromDOM(dom.window.document);
}

function importInto(editor: LexicalEditor, html: string): void {
  editor.update(
    () => {
      const nodes = $generate(html);
      $getRoot().clear().splice(0, 0, nodes);
    },
    {discrete: true},
  );
}

describe('HorizontalRuleImportExtension', () => {
  test('<hr> imports as HorizontalRuleNode', () => {
    using editor = buildEditor();
    importInto(editor, '<hr>');
    editor.read(() => {
      const node = $getRoot().getFirstChild();
      assert($isHorizontalRuleNode(node), 'expected HorizontalRuleNode');
    });
  });

  test('<hr> between paragraphs preserves surrounding structure', () => {
    using editor = buildEditor();
    importInto(editor, '<p>before</p><hr><p>after</p>');
    editor.read(() => {
      const children = $getRoot().getChildren();
      expect(children).toHaveLength(3);
      assert($isParagraphNode(children[0]), 'expected paragraph');
      assert($isHorizontalRuleNode(children[1]), 'expected HorizontalRuleNode');
      assert($isParagraphNode(children[2]), 'expected paragraph');
      expect(children[0].getTextContent()).toBe('before');
      expect(children[2].getTextContent()).toBe('after');
    });
  });
});
