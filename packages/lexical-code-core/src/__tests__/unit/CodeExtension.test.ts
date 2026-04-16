/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeExtension} from '@lexical/code';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $getRoot,
  $isElementNode,
  KEY_ENTER_COMMAND,
} from 'lexical';
import {describe, expect, it} from 'vitest';

import {$createCodeHighlightNode} from '../../CodeHighlightNode';
import {$isCodeNode} from '../../CodeNode';

describe('CodeExtension', () => {
  it('should not escape code block when content has consecutive blank lines (paste scenario)', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('line1'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createCodeHighlightNode('line2'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, RichTextExtension],
      name: '[root]',
    });

    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const root = $getRoot();
        expect(root.getChildrenSize()).toBe(1);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
      },
      {discrete: true},
    );
  });

  it('should escape code block on Enter when cursor is after two trailing blank lines', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('hello'),
          $createLineBreakNode(),
          $createLineBreakNode(),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, RichTextExtension],
      name: '[root-escape]',
    });

    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const root = $getRoot();
        const codeNode = root.getFirstChildOrThrow();
        codeNode.select(codeNode.getChildrenSize(), codeNode.getChildrenSize());
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', {key: 'Enter'}),
    );

    editor.update(
      () => {
        const root = $getRoot();
        expect(root.getChildrenSize()).toBe(2);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
        const secondChild = root.getLastChildOrThrow();
        expect($isElementNode(secondChild)).toBe(true);
        expect(secondChild.getType()).toBe('paragraph');
      },
      {discrete: true},
    );
  });

  it('should not escape code block on Enter with only one trailing blank line', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('hello'),
          $createLineBreakNode(),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, RichTextExtension],
      name: '[root-one-blank]',
    });

    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const root = $getRoot();
        const codeNode = root.getFirstChildOrThrow();
        codeNode.select(codeNode.getChildrenSize(), codeNode.getChildrenSize());
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', {key: 'Enter'}),
    );

    editor.update(
      () => {
        const root = $getRoot();
        // Should still be just one code node, no paragraph created
        expect(root.getChildrenSize()).toBe(1);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
      },
      {discrete: true},
    );
  });

  it('should not escape code block on Enter when cursor is not at the end', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append(
          $createCodeHighlightNode('hello'),
          $createLineBreakNode(),
          $createLineBreakNode(),
          $createCodeHighlightNode('world'),
        );
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, RichTextExtension],
      name: '[root-middle]',
    });

    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const root = $getRoot();
        const codeNode = root.getFirstChildOrThrow();
        // Select at position 1, not at the end
        codeNode.select(1, 1);
      },
      {discrete: true},
    );

    editor.dispatchCommand(
      KEY_ENTER_COMMAND,
      new KeyboardEvent('keydown', {key: 'Enter'}),
    );

    editor.update(
      () => {
        const root = $getRoot();
        // Should still be just one code node
        expect(root.getChildrenSize()).toBe(1);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
      },
      {discrete: true},
    );
  });
});
