/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  ParagraphNode,
} from 'lexical';
import {describe, expect, test} from 'vitest';

import {$getReconciledDirection} from '../../LexicalReconciler';
import {initializeUnitTest} from '../utils';

describe('LexicalReconciler', () => {
  initializeUnitTest((testEnv) => {
    test('Should set direction of root node children to auto if root node has no direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'auto', 'auto']);
    });

    test('Should not set direction of root node children if root node has direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.setDirection('rtl');
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual([null, null, null]);
    });

    test('Should allow overriding direction of root node children when root node has no direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode()
            .setDirection('rtl')
            .append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('Hello')),
          $createParagraphNode()
            .setDirection('rtl')
            .append($createLineBreakNode()),
          $createParagraphNode()
            .setDirection(null)
            .append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['rtl', 'ltr', 'ltr', 'rtl', 'auto']);
    });

    test('Should allow overriding direction of root node children when root node has direction', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.setDirection('rtl');
        root.append(
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('فرعي')),
          $createParagraphNode().append($createTextNode('Hello')),
          $createParagraphNode().append($createLineBreakNode()),
        );
      });

      const directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['ltr', null, null]);
    });

    test('Should update root children when root node direction changes', async () => {
      const {editor} = testEnv;

      editor.update(() => {
        const root = $getRoot().clear();
        root.append(
          $createParagraphNode().append($createTextNode('فرعي')),
          $createParagraphNode()
            .setDirection('ltr')
            .append($createTextNode('Hello')),
        );
      });

      let directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'ltr']);

      // Remove 'auto' from un-directioned children.
      editor.update(() => {
        $getRoot().setDirection('rtl');
      });

      directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual([null, 'ltr']);

      // Re-add 'auto' to children.
      editor.update(() => {
        $getRoot().setDirection(null);
      });

      directions = editor.read(() => {
        return $getRoot()
          .getChildren<ParagraphNode>()
          .map((child) => $getReconciledDirection(child));
      });
      expect(directions).toEqual(['auto', 'ltr']);
    });
  });
});
