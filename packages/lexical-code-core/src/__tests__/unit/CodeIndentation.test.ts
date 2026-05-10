/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createCodeHighlightNode,
  $createCodeNode,
  $isCodeNode,
  CodeIndentExtension,
} from '@lexical/code';
import {buildEditorFromExtensions} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $getRoot,
  $isParagraphNode,
  configExtension,
  defineExtension,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical';
import {describe, expect, it} from 'vitest';

describe('CodeIndentExtension', () => {
  describe('escapeWithArrows', () => {
    it('should escape code block on ArrowDown when cursor is at the end', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectEnd();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowDown'}),
      );

      editor.update(
        () => {
          const root = $getRoot();
          expect(root.getChildrenSize()).toBe(2);
          const paragraph = root.getLastChildOrThrow();
          expect($isParagraphNode(paragraph)).toBe(true);
        },
        {discrete: true},
      );
    });

    it('should not escape code block on Alt/Option + ArrowDown when cursor is at the end', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectEnd();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', {altKey: true, key: 'ArrowDown'}),
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

    it('should not escape code block on ArrowDown when cursor is not at the end', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          const length = text.getTextContentSize();
          text.select(length - 1, length - 1);
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_DOWN_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowDown'}),
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

    it('should escape code block on ArrowRight when cursor is at the end', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectEnd();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_RIGHT_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowRight'}),
      );

      editor.update(
        () => {
          const root = $getRoot();
          expect(root.getChildrenSize()).toBe(2);
          const paragraph = root.getLastChildOrThrow();
          expect($isParagraphNode(paragraph)).toBe(true);
        },
        {discrete: true},
      );
    });

    it('should not escape code block on ArrowRight when cursor is not at the end', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          const length = text.getTextContentSize();
          text.select(length - 1, length - 1);
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_RIGHT_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowRight'}),
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

    it('should escape code block on ArrowUp when cursor is at the beginning', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectStart();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_UP_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowUp'}),
      );

      editor.update(
        () => {
          const root = $getRoot();
          expect(root.getChildrenSize()).toBe(2);
          const paragraph = root.getFirstChildOrThrow();
          expect($isParagraphNode(paragraph)).toBe(true);
        },
        {discrete: true},
      );
    });

    it('should not escape code block on ArrowUp when cursor is not at the beginning', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.select(1, 1);
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_UP_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowUp'}),
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

    it('should escape code block on ArrowLeft when cursor is at the beginning', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectStart();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_LEFT_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowLeft'}),
      );

      editor.update(
        () => {
          const root = $getRoot();
          expect(root.getChildrenSize()).toBe(2);
          const paragraph = root.getFirstChildOrThrow();
          expect($isParagraphNode(paragraph)).toBe(true);
        },
        {discrete: true},
      );
    });

    it('should not escape code block on Alt/Option + ArrowUp when cursor is at the beginning', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.selectStart();
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_UP_COMMAND,
        new KeyboardEvent('keydown', {altKey: true, key: 'ArrowUp'}),
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

    it('should not escape code block on ArrowLeft when cursor is not at the beginning', () => {
      const ext = defineExtension({
        $initialEditorState: () => {
          const codeNode = $createCodeNode('javascript');
          const text = $createCodeHighlightNode('hello world');
          codeNode.append(text);
          $getRoot().append(codeNode);
          text.select(1, 1);
        },
        dependencies: [
          configExtension(CodeIndentExtension, {escapeWithArrows: true}),
          RichTextExtension,
        ],
        name: '[root-middle]',
      });
      using editor = buildEditorFromExtensions(ext);

      editor.dispatchCommand(
        KEY_ARROW_LEFT_COMMAND,
        new KeyboardEvent('keydown', {key: 'ArrowLeft'}),
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
});
