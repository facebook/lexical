/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {initializeUnitTest} from '../utils';

describe('Issue #7729: paragraph indent round-trip via data-lexical-indent', () => {
  initializeUnitTest(testEnv => {
    test('exportDOM emits data-lexical-indent and importDOM round-trips', () => {
      const {editor} = testEnv;
      editor.update(
        () => {
          const para = $createParagraphNode().append($createTextNode('hi'));
          para.setIndent(2);
          $getRoot().clear().append(para);
        },
        {discrete: true},
      );

      let html = '';
      editor.read(() => {
        html = $generateHtmlFromNodes(editor);
      });

      expect(html).toContain('data-lexical-indent="2"');
      expect(html).toContain('padding-inline-start: 80px');

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          nodes.forEach(n => $getRoot().append(n));
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        if (!$isParagraphNode(para)) {
          throw new Error('expected paragraph node');
        }
        expect(para.getIndent()).toBe(2);
      });
    });

    test('data-lexical-indent wins over a calc(...) padding-inline-start', () => {
      const {editor} = testEnv;
      // What live-DOM copy/paste produces: the reconciler writes a calc(...)
      // expression that parseInt cannot recover. The data attribute makes
      // this unambiguous.
      const html =
        '<p data-lexical-indent="2" style="padding-inline-start: calc(2 * var(--lexical-indent-base-value, 40px));">hi</p>';

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          nodes.forEach(n => $getRoot().append(n));
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        if (!$isParagraphNode(para)) {
          throw new Error('expected paragraph node');
        }
        expect(para.getIndent()).toBe(2);
      });
    });

    test('data-lexical-indent wins over a non-40-multiple padding-inline-start', () => {
      const {editor} = testEnv;
      // Simulates a custom --lexical-indent-base-value (e.g. 16px): the
      // padding value (32px) would round to indent=1 with the old heuristic;
      // the data attribute restores the true value.
      const html =
        '<p data-lexical-indent="2" style="padding-inline-start: 32px;">hi</p>';

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          nodes.forEach(n => $getRoot().append(n));
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        if (!$isParagraphNode(para)) {
          throw new Error('expected paragraph node');
        }
        expect(para.getIndent()).toBe(2);
      });
    });

    test('falls back to padding heuristic when data-lexical-indent is absent', () => {
      const {editor} = testEnv;
      // HTML from non-Lexical sources still uses the legacy padding heuristic.
      const html = '<p style="padding-inline-start: 80px;">hi</p>';

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(html, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          nodes.forEach(n => $getRoot().append(n));
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        if (!$isParagraphNode(para)) {
          throw new Error('expected paragraph node');
        }
        expect(para.getIndent()).toBe(2);
      });
    });
  });
});
