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

describe('Issue #7729: paragraph indent lost on DOM round-trip', () => {
  initializeUnitTest(testEnv => {
    test('exportDOM -> importDOM preserves indent (literal Npx case)', () => {
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

      // exportDOM writes `${indent * 40}px` literally, so this should be 80px.
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
        expect($isParagraphNode(para)).toBe(true);
        expect(para.getIndent()).toBe(2); // baseline round-trip
      });
    });

    test('importDOM fails when style uses calc(var(--lexical-indent-base-value))', () => {
      const {editor} = testEnv;
      const reconcilerLikeHtml =
        '<p style="padding-inline-start: calc(2 * var(--lexical-indent-base-value, 40px));">hi</p>';

      editor.update(
        () => {
          const parser = new DOMParser();
          const dom = parser.parseFromString(reconcilerLikeHtml, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          $getRoot().clear();
          nodes.forEach(n => $getRoot().append(n));
        },
        {discrete: true},
      );

      editor.read(() => {
        const para = $getRoot().getFirstChildOrThrow();
        expect($isParagraphNode(para)).toBe(true);
        // BUG: parseInt('calc(2 * var(...))') is NaN, so indent collapses to 0.
        expect(para.getIndent()).toBe(2);
      });
    });

    test('importDOM fails when custom base value yields non-40-multiple px', () => {
      const {editor} = testEnv;
      // Simulates --lexical-indent-base-value: 2em rendered to inline px,
      // e.g. copy/paste of computed style: 2 levels * 2em = 4em which a
      // browser may serialize as e.g. 32px (with default 16px font).
      const html = '<p style="padding-inline-start: 32px;">hi</p>';

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
        expect($isParagraphNode(para)).toBe(true);
        // With hardcoded /40 divisor: round(32/40) = 1 instead of 2.
        // This documents that the divisor doesn't honour
        // --lexical-indent-base-value.
        expect(para.getIndent()).toBe(2);
      });
    });
  });
});
