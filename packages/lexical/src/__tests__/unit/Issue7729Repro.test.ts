/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$insertGeneratedNodes} from '@lexical/clipboard';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  ParagraphNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

function setUpEditor() {
  const editor = buildEditorFromExtensions(
    RichTextExtension,
    defineExtension({name: 'issue-7729-repro'}),
  );
  editor.setRootElement(document.createElement('div'));
  return editor;
}

function $importHtml(editor: ReturnType<typeof setUpEditor>, html: string) {
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      $insertGeneratedNodes(editor, nodes, root.select(0));
    },
    {discrete: true},
  );
}

describe('Issue #7729: paragraph indent round-trip via data-lexical-indent', () => {
  test('exportDOM emits data-lexical-indent and importDOM round-trips', () => {
    using editor = buildEditorFromExtensions(
      RichTextExtension,
      defineExtension({
        $initialEditorState: () => {
          const para = $createParagraphNode().append($createTextNode('hi'));
          para.setIndent(2);
          $getRoot().clear().append(para);
        },
        name: 'issue-7729-export',
      }),
    );
    editor.setRootElement(document.createElement('div'));

    let html = '';
    editor.read(() => {
      html = $generateHtmlFromNodes(editor);
    });

    expect(html).toContain('data-lexical-indent="2"');
    expect(html).toContain('padding-inline-start: 80px');

    $importHtml(editor, html);

    editor.read(() => {
      const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
      expect($isParagraphNode(para)).toBe(true);
      expect(para.getIndent()).toBe(2);
    });
  });

  test('data-lexical-indent wins over a calc(...) padding-inline-start', () => {
    using editor = setUpEditor();
    // What live-DOM copy/paste produces: the reconciler writes a calc(...)
    // expression that parseInt cannot recover. The data attribute makes
    // this unambiguous.
    $importHtml(
      editor,
      '<p data-lexical-indent="2" style="padding-inline-start: calc(2 * var(--lexical-indent-base-value, 40px));">hi</p>',
    );

    editor.read(() => {
      const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
      expect($isParagraphNode(para)).toBe(true);
      expect(para.getIndent()).toBe(2);
    });
  });

  test('data-lexical-indent wins over a non-40-multiple padding-inline-start', () => {
    using editor = setUpEditor();
    // Simulates a custom --lexical-indent-base-value (e.g. 16px): the
    // padding value (32px) would round to indent=1 with the old heuristic;
    // the data attribute restores the true value.
    $importHtml(
      editor,
      '<p data-lexical-indent="2" style="padding-inline-start: 32px;">hi</p>',
    );

    editor.read(() => {
      const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
      expect($isParagraphNode(para)).toBe(true);
      expect(para.getIndent()).toBe(2);
    });
  });

  test('falls back to padding heuristic when data-lexical-indent is absent', () => {
    using editor = setUpEditor();
    // HTML from non-Lexical sources still uses the legacy padding heuristic.
    $importHtml(editor, '<p style="padding-inline-start: 80px;">hi</p>');

    editor.read(() => {
      const para = $getRoot().getFirstChildOrThrow<ParagraphNode>();
      expect($isParagraphNode(para)).toBe(true);
      expect(para.getIndent()).toBe(2);
    });
  });
});
