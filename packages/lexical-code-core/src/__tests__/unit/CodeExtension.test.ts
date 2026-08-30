/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createCodeNode, CodeExtension} from '@lexical/code';
import {$createCodeHighlightNode, $isCodeNode} from '@lexical/code-core';
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createTabNode,
  $getRoot,
  $isElementNode,
  $isTabNode,
  KEY_ENTER_COMMAND,
} from 'lexical';
import {$assertNodeType} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

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
        const codeNode = $assertNodeType(
          $getRoot().getFirstChild(),
          $isCodeNode,
        );
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
        const codeNode = $assertNodeType(
          $getRoot().getFirstChild(),
          $isCodeNode,
        );
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
        expect(root.getChildrenSize()).toBe(1);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
      },
      {discrete: true},
    );
  });

  it('should strip format from TabNode inside CodeNode', () => {
    const ext = defineExtension({
      $initialEditorState: () => {
        const codeNode = $createCodeNode('javascript');
        codeNode.append($createCodeHighlightNode('x'), $createTabNode());
        $getRoot().append(codeNode);
      },
      dependencies: [CodeExtension, RichTextExtension],
      name: '[tab-format]',
    });
    using editor = buildEditorFromExtensions(ext);
    editor.update(
      () => {
        const codeNode = $assertNodeType(
          $getRoot().getFirstChild(),
          $isCodeNode,
        );
        $assertNodeType(codeNode.getLastChild(), $isTabNode).setFormat(1);
      },
      {discrete: true},
    );
    editor.read(() => {
      const codeNode = $assertNodeType($getRoot().getFirstChild(), $isCodeNode);
      const tab = $assertNodeType(codeNode.getLastChild(), $isTabNode);
      expect(tab.getFormat()).toBe(0);
    });
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
        const codeNode = $assertNodeType(
          $getRoot().getFirstChild(),
          $isCodeNode,
        );
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
        expect(root.getChildrenSize()).toBe(1);
        expect($isCodeNode(root.getFirstChildOrThrow())).toBe(true);
      },
      {discrete: true},
    );
  });
});
