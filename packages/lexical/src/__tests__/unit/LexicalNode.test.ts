/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getRoot,
  $getSelection,
  $isNodeSelection,
  ParagraphNode,
  TextNode,
} from 'lexical';

import {LexicalNode} from '../../LexicalNode';
import {$createParagraphNode} from '../../nodes/LexicalParagraphNode';
import {$createTextNode} from '../../nodes/LexicalTextNode';
import {
  $createTestInlineElementNode,
  initializeUnitTest,
  TestElementNode,
  TestInlineElementNode,
} from '../utils';

class TestNode extends LexicalNode {
  static getType(): string {
    return 'test';
  }

  static clone(node: TestNode) {
    return new TestNode(node.__key);
  }

  createDOM() {
    return document.createElement('div');
  }

  static importJSON() {
    return new TestNode();
  }

  exportJSON() {
    return {type: 'test', version: 1};
  }
}

// This is a hack to bypass the node type validation on LexicalNode. We never want to create
// an LexicalNode directly but we're testing the base functionality in this module.
LexicalNode.getType = function () {
  return 'node';
};

describe('LexicalNode tests', () => {
  initializeUnitTest(
    (testEnv) => {
      let paragraphNode;
      let textNode;

      beforeEach(async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const rootNode = $getRoot();
          paragraphNode = new ParagraphNode();
          textNode = new TextNode('foo');
          paragraphNode.append(textNode);
          rootNode.append(paragraphNode);
        });
      });

      test('LexicalNode.constructor', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode('__custom_key__');
          expect(node.__type).toBe('node');
          expect(node.__key).toBe('__custom_key__');
          expect(node.__parent).toBe(null);
        });

        await editor.getEditorState().read(() => {
          expect(() => new LexicalNode()).toThrow();
          expect(() => new LexicalNode('__custom_key__')).toThrow();
        });
      });

      test('LexicalNode.clone()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode('__custom_key__');

          expect(() => node.clone()).toThrow();
        });
      });

      test('LexicalNode.getType()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode('__custom_key__');
          expect(node.getType()).toEqual(node.__type);
        });
      });

      test('LexicalNode.isAttached()', async () => {
        const {editor} = testEnv;
        let node;

        await editor.update(() => {
          node = new LexicalNode('__custom_key__');
        });

        await editor.getEditorState().read(() => {
          expect(node.isAttached()).toBe(false);
          expect(textNode.isAttached()).toBe(true);
          expect(paragraphNode.isAttached()).toBe(true);
        });

        expect(() => textNode.isAttached()).toThrow();
      });

      test('LexicalNode.isSelected()', async () => {
        const {editor} = testEnv;
        let node;

        await editor.update(() => {
          node = new LexicalNode('__custom_key__');
        });

        await editor.getEditorState().read(() => {
          expect(node.isSelected()).toBe(false);
          expect(textNode.isSelected()).toBe(false);
          expect(paragraphNode.isSelected()).toBe(false);
        });

        await editor.update(() => {
          textNode.select(0, 0);
        });

        await editor.getEditorState().read(() => {
          expect(textNode.isSelected()).toBe(true);
        });

        expect(() => textNode.isSelected()).toThrow();
      });

      test('LexicalNode.isSelected(): selected text node', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(paragraphNode.isSelected()).toBe(false);
          expect(textNode.isSelected()).toBe(false);
        });

        await editor.update(() => {
          textNode.select(0, 0);
        });

        await editor.getEditorState().read(() => {
          expect(textNode.isSelected()).toBe(true);
          expect(paragraphNode.isSelected()).toBe(false);
        });
      });

      test('LexicalNode.isSelected(): selected block node range', async () => {
        const {editor} = testEnv;
        let newParagraphNode;
        let newTextNode;

        await editor.update(() => {
          expect(paragraphNode.isSelected()).toBe(false);
          expect(textNode.isSelected()).toBe(false);
          newParagraphNode = new ParagraphNode();
          newTextNode = new TextNode('bar');
          newParagraphNode.append(newTextNode);
          paragraphNode.insertAfter(newParagraphNode);
          expect(newParagraphNode.isSelected()).toBe(false);
          expect(newTextNode.isSelected()).toBe(false);
        });

        await editor.update(() => {
          textNode.select(0, 0);
          const selection = $getSelection();

          expect(selection).not.toBe(null);

          if ($isNodeSelection(selection)) {
            return;
          }

          selection.anchor.type = 'text';
          selection.anchor.offset = 1;
          selection.anchor.key = textNode.getKey();
          selection.focus.type = 'text';
          selection.focus.offset = 1;
          selection.focus.key = newTextNode.getKey();
        });

        await Promise.resolve().then();

        await editor.update(() => {
          const selection = $getSelection();

          if ($isNodeSelection(selection)) {
            return;
          }

          expect(selection.anchor.key).toBe(textNode.getKey());
          expect(selection.focus.key).toBe(newTextNode.getKey());
          expect(paragraphNode.isSelected()).toBe(true);
          expect(textNode.isSelected()).toBe(true);
          expect(newParagraphNode.isSelected()).toBe(true);
          expect(newTextNode.isSelected()).toBe(true);
        });
      });

      test('LexicalNode.getKey()', async () => {
        expect(textNode.getKey()).toEqual(textNode.__key);
      });

      test('LexicalNode.getParent()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(node.getParent()).toBe(null);
        });

        await editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          expect(textNode.getParent()).toBe(paragraphNode);
          expect(paragraphNode.getParent()).toBe(rootNode);
        });
        expect(() => textNode.getParent()).toThrow();
      });

      test('LexicalNode.getParentOrThrow()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(() => node.getParentOrThrow()).toThrow();
        });

        await editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          expect(textNode.getParent()).toBe(paragraphNode);
          expect(paragraphNode.getParent()).toBe(rootNode);
        });
        expect(() => textNode.getParentOrThrow()).toThrow();
      });

      test('LexicalNode.getTopLevelElement()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(node.getTopLevelElement()).toBe(null);
        });

        await editor.getEditorState().read(() => {
          expect(textNode.getTopLevelElement()).toBe(paragraphNode);
          expect(paragraphNode.getTopLevelElement()).toBe(paragraphNode);
        });
        expect(() => textNode.getTopLevelElement()).toThrow();
      });

      test('LexicalNode.getTopLevelElementOrThrow()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(() => node.getTopLevelElementOrThrow()).toThrow();
        });

        await editor.getEditorState().read(() => {
          expect(textNode.getTopLevelElementOrThrow()).toBe(paragraphNode);
          expect(paragraphNode.getTopLevelElementOrThrow()).toBe(paragraphNode);
        });
        expect(() => textNode.getTopLevelElementOrThrow()).toThrow();
      });

      test('LexicalNode.getParents()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(node.getParents()).toEqual([]);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          expect(textNode.getParents()).toEqual([paragraphNode, rootNode]);
          expect(paragraphNode.getParents()).toEqual([rootNode]);
        });
        expect(() => textNode.getParents()).toThrow();
      });

      test('LexicalNode.getPreviousSibling()', async () => {
        const {editor} = testEnv;
        let barTextNode;

        await editor.update(() => {
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          paragraphNode.append(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(barTextNode.getPreviousSibling()).toEqual({
            ...textNode,
            __next: '3',
          });
          expect(textNode.getPreviousSibling()).toEqual(null);
        });
        expect(() => textNode.getPreviousSibling()).toThrow();
      });

      test('LexicalNode.getPreviousSiblings()', async () => {
        const {editor} = testEnv;
        let barTextNode;
        let bazTextNode;

        await editor.update(() => {
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          bazTextNode = new TextNode('baz');
          bazTextNode.toggleUnmergeable();
          paragraphNode.append(barTextNode, bazTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span><span data-lexical-text="true">baz</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(bazTextNode.getPreviousSiblings()).toEqual([
            {
              ...textNode,
              __next: '3',
            },
            {
              ...barTextNode,
              __prev: '2',
            },
          ]);
          expect(barTextNode.getPreviousSiblings()).toEqual([
            {
              ...textNode,
              __next: '3',
            },
          ]);
          expect(textNode.getPreviousSiblings()).toEqual([]);
        });
        expect(() => textNode.getPreviousSiblings()).toThrow();
      });

      test('LexicalNode.getNextSibling()', async () => {
        const {editor} = testEnv;
        let barTextNode;

        await editor.update(() => {
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          paragraphNode.append(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(barTextNode.getNextSibling()).toEqual(null);
          expect(textNode.getNextSibling()).toEqual(barTextNode);
        });
        expect(() => textNode.getNextSibling()).toThrow();
      });

      test('LexicalNode.getNextSiblings()', async () => {
        const {editor} = testEnv;
        let barTextNode;
        let bazTextNode;

        await editor.update(() => {
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          bazTextNode = new TextNode('baz');
          bazTextNode.toggleUnmergeable();
          paragraphNode.append(barTextNode, bazTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span><span data-lexical-text="true">baz</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(bazTextNode.getNextSiblings()).toEqual([]);
          expect(barTextNode.getNextSiblings()).toEqual([bazTextNode]);
          expect(textNode.getNextSiblings()).toEqual([
            barTextNode,
            bazTextNode,
          ]);
        });
        expect(() => textNode.getNextSiblings()).toThrow();
      });

      test('LexicalNode.getCommonAncestor()', async () => {
        const {editor} = testEnv;
        let quxTextNode;
        let barParagraphNode;
        let barTextNode;
        let bazParagraphNode;
        let bazTextNode;

        await editor.update(() => {
          const rootNode = $getRoot();
          barParagraphNode = new ParagraphNode();
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          bazParagraphNode = new ParagraphNode();
          bazTextNode = new TextNode('baz');
          bazTextNode.toggleUnmergeable();
          quxTextNode = new TextNode('qux');
          quxTextNode.toggleUnmergeable();
          paragraphNode.append(quxTextNode);
          expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(null);
          barParagraphNode.append(barTextNode);
          bazParagraphNode.append(bazTextNode);
          expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(null);
          rootNode.append(barParagraphNode, bazParagraphNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">qux</span></p><p dir="ltr"><span data-lexical-text="true">bar</span></p><p dir="ltr"><span data-lexical-text="true">baz</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          expect(textNode.getCommonAncestor(rootNode)).toBe(rootNode);
          expect(quxTextNode.getCommonAncestor(rootNode)).toBe(rootNode);
          expect(barTextNode.getCommonAncestor(rootNode)).toBe(rootNode);
          expect(bazTextNode.getCommonAncestor(rootNode)).toBe(rootNode);
          expect(textNode.getCommonAncestor(quxTextNode)).toBe(
            paragraphNode.getLatest(),
          );
          expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(rootNode);
          expect(barTextNode.getCommonAncestor(bazTextNode)).toBe(rootNode);
        });

        expect(() => textNode.getCommonAncestor(barTextNode)).toThrow();
      });

      test('LexicalNode.isBefore()', async () => {
        const {editor} = testEnv;
        let barTextNode;
        let bazTextNode;

        await editor.update(() => {
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          bazTextNode = new TextNode('baz');
          bazTextNode.toggleUnmergeable();
          paragraphNode.append(barTextNode, bazTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span><span data-lexical-text="true">baz</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(textNode.isBefore(textNode)).toBe(false);
          expect(textNode.isBefore(barTextNode)).toBe(true);
          expect(textNode.isBefore(bazTextNode)).toBe(true);
          expect(barTextNode.isBefore(bazTextNode)).toBe(true);
          expect(bazTextNode.isBefore(barTextNode)).toBe(false);
          expect(bazTextNode.isBefore(textNode)).toBe(false);
        });
        expect(() => textNode.isBefore(barTextNode)).toThrow();
      });

      test('LexicalNode.isParentOf()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          const rootNode = $getRoot();
          expect(rootNode.isParentOf(textNode)).toBe(true);
          expect(rootNode.isParentOf(paragraphNode)).toBe(true);
          expect(paragraphNode.isParentOf(textNode)).toBe(true);
          expect(paragraphNode.isParentOf(rootNode)).toBe(false);
          expect(textNode.isParentOf(paragraphNode)).toBe(false);
          expect(textNode.isParentOf(rootNode)).toBe(false);
        });
        expect(() => paragraphNode.isParentOf(textNode)).toThrow();
      });

      test('LexicalNode.getNodesBetween()', async () => {
        const {editor} = testEnv;
        let barTextNode;
        let bazTextNode;
        let newParagraphNode;
        let quxTextNode;

        await editor.update(() => {
          const rootNode = $getRoot();
          barTextNode = new TextNode('bar');
          barTextNode.toggleUnmergeable();
          bazTextNode = new TextNode('baz');
          bazTextNode.toggleUnmergeable();
          newParagraphNode = new ParagraphNode();
          quxTextNode = new TextNode('qux');
          quxTextNode.toggleUnmergeable();
          rootNode.append(newParagraphNode);
          paragraphNode.append(barTextNode, bazTextNode);
          newParagraphNode.append(quxTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span><span data-lexical-text="true">baz</span></p><p dir="ltr"><span data-lexical-text="true">qux</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(textNode.getNodesBetween(textNode)).toEqual([textNode]);
          expect(textNode.getNodesBetween(barTextNode)).toEqual([
            textNode,
            barTextNode,
          ]);
          expect(textNode.getNodesBetween(bazTextNode)).toEqual([
            textNode,
            barTextNode,
            bazTextNode,
          ]);
          expect(textNode.getNodesBetween(quxTextNode)).toEqual([
            textNode,
            barTextNode,
            bazTextNode,
            paragraphNode.getLatest(),
            newParagraphNode,
            quxTextNode,
          ]);
        });
        expect(() => textNode.getNodesBetween(bazTextNode)).toThrow();
      });

      test('LexicalNode.isToken()', async () => {
        const {editor} = testEnv;
        let tokenTextNode;

        await editor.update(() => {
          tokenTextNode = new TextNode('token').setMode('token');
          paragraphNode.append(tokenTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">token</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(textNode.isToken(textNode)).toBe(false);
          expect(tokenTextNode.isToken()).toBe(true);
        });
        expect(() => textNode.isToken()).toThrow();
      });

      test('LexicalNode.isSegmented()', async () => {
        const {editor} = testEnv;
        let segmentedTextNode;

        await editor.update(() => {
          segmentedTextNode = new TextNode('segmented').setMode('segmented');
          paragraphNode.append(segmentedTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">segmented</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(textNode.isSegmented(textNode)).toBe(false);
          expect(segmentedTextNode.isSegmented()).toBe(true);
        });
        expect(() => textNode.isSegmented()).toThrow();
      });

      test('LexicalNode.isDirectionless()', async () => {
        const {editor} = testEnv;
        let directionlessTextNode;

        await editor.update(() => {
          directionlessTextNode = new TextNode(
            'directionless',
          ).toggleDirectionless();
          directionlessTextNode.toggleUnmergeable();
          paragraphNode.append(directionlessTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">directionless</span></p></div>',
        );

        await editor.getEditorState().read(() => {
          expect(textNode.isDirectionless()).toBe(false);
          expect(directionlessTextNode.isDirectionless()).toBe(true);
        });
        expect(() => directionlessTextNode.isDirectionless()).toThrow();
      });

      test('LexicalNode.getLatest()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(textNode.getLatest()).toBe(textNode);
        });
        expect(() => textNode.getLatest()).toThrow();
      });

      test('LexicalNode.getLatest(): garbage collected node', async () => {
        const {editor} = testEnv;
        let node;
        let text;
        let block;

        await editor.update(() => {
          node = new LexicalNode();
          node.getLatest();
          text = new TextNode('');
          text.getLatest();
          block = new TestElementNode();
          block.getLatest();
        });

        await editor.update(() => {
          expect(() => node.getLatest()).toThrow();
          expect(() => text.getLatest()).toThrow();
          expect(() => block.getLatest()).toThrow();
        });
      });

      test('LexicalNode.getTextContent()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          expect(node.getTextContent()).toBe('');
        });

        await editor.getEditorState().read(() => {
          expect(textNode.getTextContent()).toBe('foo');
        });
        expect(() => textNode.getTextContent()).toThrow();
      });

      test('LexicalNode.getTextContentSize()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(textNode.getTextContentSize()).toBe('foo'.length);
        });
        expect(() => textNode.getTextContentSize()).toThrow();
      });

      test('LexicalNode.createDOM()', async () => {
        const {editor} = testEnv;

        editor.update(() => {
          const node = new LexicalNode();
          expect(() =>
            node.createDOM(
              {
                namespace: '',
                theme: {},
              },
              editor,
            ),
          ).toThrow();
        });
      });

      test('LexicalNode.updateDOM()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const node = new LexicalNode();
          // @ts-expect-error
          expect(() => node.updateDOM()).toThrow();
        });
      });

      test('LexicalNode.remove()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(() => textNode.remove()).toThrow();
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const node = new LexicalNode();
          node.remove();
          expect(node.getParent()).toBe(null);
          textNode.remove();
          expect(textNode.getParent()).toBe(null);
          expect(editor._dirtyLeaves.has(textNode.getKey()));
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><br></p></div>',
        );
        expect(() => textNode.remove()).toThrow();
      });

      test('LexicalNode.replace()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(() => textNode.replace()).toThrow();
        });
        expect(() => textNode.remove()).toThrow();
      });

      test('LexicalNode.replace(): from another parent', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );
        let barTextNode;

        await editor.update(() => {
          const rootNode = $getRoot();
          const barParagraphNode = new ParagraphNode();
          barTextNode = new TextNode('bar');
          barParagraphNode.append(barTextNode);
          rootNode.append(barParagraphNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p><p dir="ltr"><span data-lexical-text="true">bar</span></p></div>',
        );

        await editor.update(() => {
          textNode.replace(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span></p><p dir="ltr"><br></p></div>',
        );
      });

      test('LexicalNode.replace(): text', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar');
          textNode.replace(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.replace(): token', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('token');
          textNode.replace(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.replace(): segmented', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('segmented');
          textNode.replace(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.replace(): directionless', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode(`bar`).toggleDirectionless();
          textNode.replace(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><span data-lexical-text="true">bar</span></p></div>',
        );
        // TODO: add text direction validations
      });

      test('LexicalNode.replace() within canBeEmpty: false', async () => {
        const {editor} = testEnv;

        jest
          .spyOn(TestInlineElementNode.prototype, 'canBeEmpty')
          .mockReturnValue(false);

        await editor.update(() => {
          textNode = $createTextNode('Hello');

          $getRoot()
            .clear()
            .append(
              $createParagraphNode().append(
                $createTestInlineElementNode().append(textNode),
              ),
            );

          textNode.replace($createTextNode('world'));
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><a dir="ltr"><span data-lexical-text="true">world</span></a></p></div>',
        );
      });

      test('LexicalNode.insertAfter()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(() => textNode.insertAfter()).toThrow();
        });
        expect(() => textNode.insertAfter()).toThrow();
      });

      test('LexicalNode.insertAfter(): text', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar');
          textNode.insertAfter(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foobar</span></p></div>',
        );
      });

      test('LexicalNode.insertAfter(): token', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('token');
          textNode.insertAfter(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.insertAfter(): segmented', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('token');
          textNode.insertAfter(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.insertAfter(): directionless', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode(`bar`).toggleDirectionless();
          textNode.insertAfter(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foobar</span></p></div>',
        );
        // TODO: add text direction validations
      });

      test('LexicalNode.insertAfter() move blocks around', async () => {
        const {editor} = testEnv;
        let block1, block2, block3, text1, text2, text3;

        await editor.update(() => {
          const root = $getRoot();
          root.clear();
          block1 = new ParagraphNode();
          block2 = new ParagraphNode();
          block3 = new ParagraphNode();
          text1 = new TextNode('A');
          text2 = new TextNode('B');
          text3 = new TextNode('C');
          block1.append(text1);
          block2.append(text2);
          block3.append(text3);
          root.append(block1, block2, block3);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">A</span></p><p dir="ltr"><span data-lexical-text="true">B</span></p><p dir="ltr"><span data-lexical-text="true">C</span></p></div>',
        );

        await editor.update(() => {
          text1.insertAfter(block2);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">A</span><p dir="ltr"><span data-lexical-text="true">B</span></p></p><p dir="ltr"><span data-lexical-text="true">C</span></p></div>',
        );
      });

      test('LexicalNode.insertAfter() move blocks around #2', async () => {
        const {editor} = testEnv;
        let block1, block2, block3, text1, text2, text3;

        await editor.update(() => {
          const root = $getRoot();
          root.clear();
          block1 = new ParagraphNode();
          block2 = new ParagraphNode();
          block3 = new ParagraphNode();
          text1 = new TextNode('A');
          text1.toggleUnmergeable();
          text2 = new TextNode('B');
          text2.toggleUnmergeable();
          text3 = new TextNode('C');
          text3.toggleUnmergeable();
          block1.append(text1);
          block2.append(text2);
          block3.append(text3);
          root.append(block1);
          root.append(block2);
          root.append(block3);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">A</span></p><p dir="ltr"><span data-lexical-text="true">B</span></p><p dir="ltr"><span data-lexical-text="true">C</span></p></div>',
        );

        await editor.update(() => {
          text3.insertAfter(text1);
          text3.insertAfter(text2);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><br></p><p><br></p><p dir="ltr"><span data-lexical-text="true">C</span><span data-lexical-text="true">B</span><span data-lexical-text="true">A</span></p></div>',
        );
      });

      test('LexicalNode.insertBefore()', async () => {
        const {editor} = testEnv;

        await editor.getEditorState().read(() => {
          expect(() => textNode.insertBefore()).toThrow();
        });
        expect(() => textNode.insertBefore()).toThrow();
      });

      test('LexicalNode.insertBefore(): from another parent', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );
        let barTextNode;

        await editor.update(() => {
          const rootNode = $getRoot();
          const barParagraphNode = new ParagraphNode();
          barTextNode = new TextNode('bar');
          barParagraphNode.append(barTextNode);
          rootNode.append(barParagraphNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p><p dir="ltr"><span data-lexical-text="true">bar</span></p></div>',
        );
      });

      test('LexicalNode.insertBefore(): text', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar');
          textNode.insertBefore(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">barfoo</span></p></div>',
        );
      });

      test('LexicalNode.insertBefore(): token', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('token');
          textNode.insertBefore(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span><span data-lexical-text="true">foo</span></p></div>',
        );
      });

      test('LexicalNode.insertBefore(): segmented', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode('bar').setMode('segmented');
          textNode.insertBefore(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">bar</span><span data-lexical-text="true">foo</span></p></div>',
        );
      });

      test('LexicalNode.insertBefore(): directionless', async () => {
        const {editor} = testEnv;

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p dir="ltr"><span data-lexical-text="true">foo</span></p></div>',
        );

        await editor.update(() => {
          const barTextNode = new TextNode(`bar`).toggleDirectionless();
          textNode.insertBefore(barTextNode);
        });

        expect(testEnv.outerHTML).toBe(
          '<div contenteditable="true" style="user-select: text; white-space: pre-wrap; word-break: break-word;" data-lexical-editor="true"><p><span data-lexical-text="true">barfoo</span></p></div>',
        );
      });

      test('LexicalNode.selectNext()', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const barTextNode = new TextNode('bar');
          textNode.insertAfter(barTextNode);

          expect(barTextNode.isSelected()).not.toBe(true);

          textNode.selectNext();

          expect(barTextNode.isSelected()).toBe(true);
          // TODO: additional validation of anchorOffset and focusOffset
        });
      });

      test('LexicalNode.selectNext(): no next sibling', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const selection = textNode.selectNext();
          expect(selection.anchor.getNode()).toBe(paragraphNode);
          expect(selection.anchor.offset).toBe(1);
        });
      });

      test('LexicalNode.selectNext(): non-text node', async () => {
        const {editor} = testEnv;

        await editor.update(() => {
          const barNode = new TestNode();
          textNode.insertAfter(barNode);
          const selection = textNode.selectNext();

          expect(selection.anchor.getNode()).toBe(textNode.getParent());
          expect(selection.anchor.offset).toBe(1);
        });
      });
    },
    {
      namespace: '',
      nodes: [LexicalNode, TestNode],
      theme: {},
    },
  );
});
